import User from "../models/User.js";

const sanitizeUser = (user) => {
    const userObj = user.toObject ? user.toObject() : user;
    const { password, ...sanitized } = userObj;
    return sanitized;
};

export const getUserById = async (userId) => {
    const user = await User.findById(userId);
    if (!user) throw new Error("User not found");
    return sanitizeUser(user);
};

export const getAllUsers = async () => {
    const users = await User.find().lean();

    return users.map(user => {
        const { password, ...sanitized } = user;
        return sanitized;
    });
};

export const updateUser = async (id, updateData) => {

    let { password, experience, experienceYears, ...safeData } = updateData;


    const expValue = experience || experienceYears;
    if (expValue !== undefined) {
        safeData.experienceYears = Number(expValue);
    }


    const allowedFields = ["name", "department", "location", "experienceYears"];
    const filteredData = {};
    for (const key of allowedFields) {
        if (safeData[key] !== undefined) {
            filteredData[key] = safeData[key];
        }
    }

    const user = await User.findByIdAndUpdate(id, filteredData, { new: true });
    if (!user) throw new Error("User not found");
    return sanitizeUser(user);
};