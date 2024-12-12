import {type Request, type Response, NextFunction } from "express"
import jwt from "jsonwebtoken"
import * as dotenv from "dotenv"
dotenv.config()

export const userMiddleware = (req:Request, res:Response, next:NextFunction) => {
    try{
        const authorizationHeader = req.headers.authorization
        if(!authorizationHeader){
            throw new Error("Please enter the token to authorize your self")
        }
        const dataToBeSplited = authorizationHeader.split(" ")

        const key = dataToBeSplited[1];

        const decodedUser = jwt.verify(key, process.env.JWT_USER_SECRET as string) as {id: string}
        if(!decodedUser){
            throw new Error("Can not decode the user")
        }
        req.userId = decodedUser.id
        next()
    }catch(err){
        console.log(err)
        res.status(400).send(`User is not authenticated ${err}`)
    }
}