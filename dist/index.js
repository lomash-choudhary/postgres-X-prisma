"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const bcrypt_1 = __importDefault(require("bcrypt"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const zod_1 = require("zod");
const dotenv = __importStar(require("dotenv"));
const client_1 = require("@prisma/client");
const userMiddleware_1 = require("./userMiddleware");
const client = new client_1.PrismaClient();
dotenv.config();
const app = (0, express_1.default)();
const port = process.env.SERVER_PORT;
app.use(express_1.default.json());
app.post("/signup", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const requiredBody = zod_1.z.object({
            username: zod_1.z.string().min(3, "Username is too short").max(200, "Username is too long"),
            password: zod_1.z.string()
                .min(8, "password should contain atleast 8 characters")
                .regex(/[A-Z]/, "password must contain atleast one upper case character")
                .regex(/[a-z]/, "password must contain atleast one lower case character")
                .regex(/[0-9]/, "password must contain atleast one numeric character")
                .regex(/[\W_]/, "password must contain atleast one special character")
        });
        const parsedBody = requiredBody.safeParse(req.body);
        if (parsedBody.error) {
            throw new Error(`Error occured while parsing the input body `);
        }
        const { username, password } = req.body;
        if (!username || !password) {
            throw new Error("Input fields are missing");
        }
        const hashedPassword = yield bcrypt_1.default.hash(password, 5);
        const result = yield client.users.create({
            data: {
                username: username,
                password: hashedPassword
            }
        });
        if (!result) {
            throw new Error(`Error occured while inserting the data into the database`);
        }
        res.status(200).send("Signed up on the app successfully");
    }
    catch (err) {
        res.status(400).send(`Error occured while signing up on the app ${err}`);
    }
}));
app.post("/signin", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { username, password } = req.body;
        const user = yield client.users.findFirst({
            where: {
                username: username
            }
        });
        if (!user) {
            throw new Error("User with this username does not exists in the database");
        }
        const comapredPassword = yield bcrypt_1.default.compare(password, user === null || user === void 0 ? void 0 : user.password);
        if (!comapredPassword) {
            throw new Error("Inncorrect Password");
        }
        // console.log(process.env.JWT_USER_SECRET)
        const authenticationKey = jsonwebtoken_1.default.sign({
            id: user.id
        }, process.env.JWT_USER_SECRET);
        if (!authenticationKey) {
            throw new Error("Unable to generate token");
        }
        res.status(200).send(`Bearer ${authenticationKey}`);
    }
    catch (err) {
        res.status(400).send(`Error occured while sign in on the app ${err}`);
    }
}));
app.post("/todo", userMiddleware_1.userMiddleware, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.userId;
        if (!userId) {
            throw new Error("User is not authenticated to add a data");
        }
        const { todo, done } = req.body;
        const result = yield client.todos.create({
            data: {
                todo,
                done,
                userId: parseInt(userId)
            }
        });
        if (!result) {
            throw new Error("Error occured while creating a todo");
        }
        res.status(200).send("Todo Added Successfully");
    }
    catch (err) {
        res.status(400).send(`Error occured while creating the todo ${err}`);
    }
}));
app.get("/todo", userMiddleware_1.userMiddleware, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.userId;
        if (!userId) {
            throw new Error("User is not authenticated to get the data");
        }
        const result = yield client.todos.findMany({
            where: {
                userId: parseInt(userId)
            },
            select: {
                todo: true,
                done: true
            }
        });
        res.status(200).send(result);
    }
    catch (err) {
        res.status(400).send(`Error occured while getting the data ${err}`);
    }
}));
app.put("/todo/:id", userMiddleware_1.userMiddleware, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.userId;
        const idToBeUpdated = req.params.id;
        if (!userId) {
            throw new Error("User is not authenticated to update the data");
        }
        const { todo, done } = req.body;
        if (todo === null && done === null) {
            throw new Error("Atleast one filed should be passed");
        }
        const doesTodoBelongs = yield client.todos.findFirst({
            where: {
                id: parseInt(idToBeUpdated),
                userId: parseInt(userId)
            }
        });
        if (!doesTodoBelongs) {
            throw new Error("Either todo does not exists or todo does not belong to the user");
        }
        const result = yield client.todos.update({
            data: {
                todo: todo,
                done: done
            },
            where: {
                id: parseInt(idToBeUpdated),
                userId: parseInt(userId)
            }
        });
        if (!result) {
            throw new Error("Unable to update the todo Try again later");
        }
        res.status(200).send("Todo updated for the given todo successfully");
    }
    catch (err) {
        console.log(err);
        res.status(400).send(`Error occured while updating the todo ${err}`);
    }
}));
app.delete("/todo/:id", userMiddleware_1.userMiddleware, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.userId;
        if (!userId) {
            throw new Error("User is not authenticated to delete the todo");
        }
        const todoToBeDeletedId = req.params.id;
        yield client.todos.delete({
            where: {
                id: parseInt(todoToBeDeletedId),
                userId: parseInt(userId)
            }
        });
        res.status(200).send("Todo for the give id deleted successfully");
    }
    catch (err) {
        res.status(400).send(`Error occured while deleting the todo ${err}`);
    }
}));
const main = () => {
    app.listen(port, () => {
        console.log(`App is listening on port ${port}`);
    });
};
main();
