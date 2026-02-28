
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import User from "../models/User.js";


const sanitizeUser = (user) => {
    const userObj = user.toObject ? user.toObject() : user;
    const { password, ...sanitized } = userObj;
    return sanitized;
};

export const registerUser = async (data) => {
    const {
        name,
        email,
        password,
        role,
        department,
        experienceYears,
        location,
        activeTaskCount
    } = data;

    const existingUser = await User.findOne({ email });
    if (existingUser) throw new Error("User already exists");

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
        name,
        email,
        password: hashedPassword,
        role,
        department,
        experienceYears,
        location,
        activeTaskCount,
    });


    return sanitizeUser(user);
};

export const loginUser = async (email, password) => {
    if (!process.env.JWT_SECRET) {
        throw new Error("Missing JWT_SECRET environment variable.");
    }

    const user = await User.findOne({ email });
    if (!user) throw new Error("Invalid credentials");

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) throw new Error("Invalid credentials");

    const token = jwt.sign(
        { id: user._id, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: "1h" }
    );


    return { user: sanitizeUser(user), token };
};
