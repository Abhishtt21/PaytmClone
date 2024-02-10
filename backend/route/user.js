const express = require('express');
const app = express();
const router = express.Router();
const zod = require('zod');
const jwt = require("jsonwebtoken")
const { User, Account } = require('../db');
const {JWT_SECRET} = require('../config');
const authMiddleware = require('../middlware');

const signUpSchema = zod.object({
    username: zod.string(),
    password: zod.string(),
    firstName: zod.string(),
    lastName: zod.string()
});

const updateUserSchema = zod.object({
    firstName : zod.string().optional(),
    lastName: zod.string().optional(),
    password:zod.string().optional()
})

router.post('/signup', async function(req,res){
    const body = req.body;
    const parsedBody = signUpSchema.safeParse(body);

    if(!parsedBody.success){
        return res.json({
            message: "Invalid data"
        })
    }

    const existingUser = await User.findOne({
        username: body.username
    })

    if(existingUser){
        return res.json({
            message: "Username taken"
        })
    }


   const dbUser = await User.create(body);

   await Account.create({
    userID: dbUser._id,
    balance: 1+ Math.random()*10000
   })
   
   const token = jwt.sign({
    userID: dbUser._id
   }, JWT_SECRET);

   res.json({
    message:"User Created",
    token: token
   })
})

router.post('/signin', async function(req,res){
    const body = req.body;
    const user = await User.findOne({
        username: body.username
    });

    if(!user){
        return res.status(411).json({
            message:"User Doesn't Exist"
        })
    }
    if(user.password != body.password){
        return res.status(411).json({
            message:"Invalid Password"
        })
    }

    const token = jwt.sign({userID: user._id}, JWT_SECRET);
    res.json({
        message: "Signin Successful",
        token: token
    })
})

router.put('/', authMiddleware, async (req,res) => {
    const body = req.body;

    const {success} = updateUserSchema.safeParse(body);

    if(!success){
        res.status(411).json({
            message:"Error while updating information"
        })
    }

    await User.updateOne(body,{
        _id: body.userID
    })

    res.json({
        message:"Updated successfully"
    })
})

router.get('/bulk', async (req,res)=>{
    const filter = req.query.filter || "";
    
    const users = await User.find({
        $or: [{
            firstName: {
                "$regex": filter
            }  
        },
        {
            lastName: {
                "$regex": filter
            }
        }
    ]
    })

    res.json({
        user: users.map(user => ({
            username: user.username,
            firstName: user.firstName,
            lastName: user.lastName,
            id : user._id
        }))
    })
})


module.exports =  router

