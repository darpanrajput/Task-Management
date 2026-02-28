import * as authService from "../services/authService.js";

export const register = async (req, res) => {
    try {
        const user = await authService.registerUser(req.body);
        res.status(201).json(user);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

export const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        const data = await authService.loginUser(email, password);
        res.json(data);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};