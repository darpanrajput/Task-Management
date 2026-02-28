import rateLimit from "express-rate-limit";

export const loginLimiter = rateLimit({
    windowMs: 5 * 60 * 1000,
    max: 5,
    message: "Too many login attempts, please try again after 15 minutes",
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => {

        return req.body?.email || req.ip;
    },
    skip: (req) => {

        return req.body?.email === "test@example.com";
    }
});


export const registerLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,   // 1 hour
    max: 3,                      // 3 requests per windowMs
    message: "Too many registration attempts, please try again after 1 hour",
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => {

        return req.body?.email || req.ip;
    }
});


export const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,   // 15 minutes
    max: 100,                    // 100 requests per windowMs
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => {

        return req.path === "/api/health";
    }
});
