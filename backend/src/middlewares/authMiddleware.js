import jwt from "jsonwebtoken";

export const protect = async (req, res, next) => {
    if (!process.env.JWT_SECRET) {
        return res.status(500).json({ message: "Server auth not configured" });
    }

    const token = req.headers.authorization?.split(" ")[1];

    if (!token) return res.status(401).json({ message: "Unauthorized" });

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (err) {
        res.status(401).json({ message: "Invalid token" });
    }
};
