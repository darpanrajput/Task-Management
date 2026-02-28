import * as userService from "../services/userService.js";

export const getUserById = async (req, res) => {
    try {
        const requestedUserId = req.params.id;
        const currentUserId = req.user?.id;

        if (req.user?.role !== "Admin" && String(currentUserId) !== String(requestedUserId)) {
            return res.status(403).json({ message: "You can only view your own profile" });
        }

        const user = await userService.getUserById(req.params.id);
        res.json(user);
    } catch (error) {
        res.status(404).json({ message: error.message });
    }
};

export const getUsers = async (req, res) => {
    try {
        if (req.user?.role !== "Admin") {
            return res.status(403).json({ message: "Only admins can view all users" });
        }

        const users = await userService.getAllUsers();
        res.json(users);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const updateUser = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user?.id;

        if (req.user.role !== "Admin" && String(userId) !== String(id)) {
            return res.status(403).json({ message: "You can only update your own profile" });
        }

        const user = await userService.updateUser(id, req.body);
        res.json(user);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};
