import express, {type Request, type Response} from "express" 
import bcrypt from "bcrypt"
import jwt from "jsonwebtoken"
import { z } from "zod"
import * as dotenv from "dotenv"
import { PrismaClient } from "@prisma/client"
import { userMiddleware } from "./userMiddleware"

const client = new PrismaClient()
dotenv.config()
const app = express()
const port = process.env.SERVER_PORT
app.use(express.json())

app.post("/signup", async (req:Request, res:Response) => {
    try{
        const requiredBody = z.object({
            username: z.string().min(3,"Username is too short").max(200,"Username is too long"),
            password: z.string()
            .min(8,"password should contain atleast 8 characters")
            .regex(/[A-Z]/,"password must contain atleast one upper case character")
            .regex(/[a-z]/,"password must contain atleast one lower case character")
            .regex(/[0-9]/,"password must contain atleast one numeric character")
            .regex(/[\W_]/,"password must contain atleast one special character")
        })
        const parsedBody = requiredBody.safeParse(req.body);
        if(parsedBody.error){
            throw new Error(`Error occured while parsing the input body `)
        }
        const {username, password} = req.body;

        if(!username || !password){
            throw new Error("Input fields are missing");
        }
        const hashedPassword = await bcrypt.hash(password, 5)

        const result = await client.users.create({
            data:{
                username:username,
                password: hashedPassword
            }
        })
        if(!result){
            throw new Error(`Error occured while inserting the data into the database`)
        }

        res.status(200).send("Signed up on the app successfully")


    }catch(err){
        res.status(400).send(`Error occured while signing up on the app ${err}`)
    }
})

app.post("/signin", async (req:Request,res:Response) => {
    try{
        const {username, password} = req.body;

        const user = await client.users.findFirst({
            where:{
                username:username
            }
        })
        if(!user){
            throw new Error("User with this username does not exists in the database");
        }

        const comapredPassword = await bcrypt.compare(password, user?.password)
        if(!comapredPassword){
            throw new Error("Inncorrect Password")
        }
        // console.log(process.env.JWT_USER_SECRET)
        const authenticationKey = jwt.sign({
           id:  user.id
        },process.env.JWT_USER_SECRET as string) 
        if(!authenticationKey){
            throw new Error("Unable to generate token")
        }
        res.status(200).send(`Bearer ${authenticationKey}`)
    }catch(err){
        res.status(400).send(`Error occured while sign in on the app ${err}`)
    }
})

app.post("/todo", userMiddleware, async (req:Request, res:Response) => {
    try{
        const userId = req.userId
        if(!userId){
            throw new Error("User is not authenticated to add a data");
        }
        const {todo, done} = req.body;
        const result = await client.todos.create({
            data:{
                todo,
                done,
                userId: parseInt(userId) 
            }
        })
        if(!result){
            throw new Error("Error occured while creating a todo")
        }
        res.status(200).send("Todo Added Successfully")
    }
    catch(err){
        res.status(400).send(`Error occured while creating the todo ${err}`)
    }
})

app.get("/todo", userMiddleware, async (req:Request, res:Response) => {
    try{
        const userId = req.userId
        if(!userId){
            throw new Error("User is not authenticated to get the data")
        }
        const result = await client.todos.findMany({
            where:{
                userId: parseInt(userId)
            },
            select:{
                todo:true,
                done: true
            }
        })
        res.status(200).send(result);
    }
    catch(err){
        res.status(400).send(`Error occured while getting the data ${err}`)
    }
})

app.put("/todo/:id", userMiddleware, async (req:Request, res:Response) => {
    try{
        const userId = req.userId
        const idToBeUpdated = req.params.id;
        if(!userId){
            throw new Error("User is not authenticated to update the data")
        }
        const {todo, done} = req.body;
        if(todo === null && done === null){
            throw new Error("Atleast one filed should be passed")
        }
        const doesTodoBelongs = await client.todos.findFirst({
            where:{
                id: parseInt(idToBeUpdated),
                userId: parseInt(userId)
            }
        })
        if(!doesTodoBelongs){
            throw new Error("Either todo does not exists or todo does not belong to the user")
        }
        const result = await client.todos.update({
            data:{
                todo:todo,
                done:done
            },
            where :{
                id:parseInt(idToBeUpdated),
                userId: parseInt(userId)
            }
        })
        if(!result){
            throw new Error("Unable to update the todo Try again later")
        }
        res.status(200).send("Todo updated for the given todo successfully")

    }catch(err){
        console.log(err);
        res.status(400).send(`Error occured while updating the todo ${err}`)
    }
})

app.delete("/todo/:id", userMiddleware, async (req:Request, res: Response) => {
    try{
        const userId = req.userId
        if(!userId){
            throw new Error("User is not authenticated to delete the todo")
        }
        const todoToBeDeletedId = req.params.id
        await client.todos.delete({
            where:{
                id: parseInt(todoToBeDeletedId),
                userId: parseInt(userId)
            }
        })
        res.status(200).send("Todo for the give id deleted successfully");
    }catch(err){
        res.status(400).send(`Error occured while deleting the todo ${err}`)
    }
})

const main = () => {
    app.listen(port,() => {
        console.log(`App is listening on port ${port}`)
    })
}
main()
