function isInvalidValue(val) {
    if (val === null || val === undefined) return true;
    if (typeof val === "string") return val.trim() === "";
    if (Array.isArray(val)) return val.some(isInvalidValue);
    if (typeof val === "object") {
        for (const k in val) {
            if (Object.prototype.hasOwnProperty.call(val, k)) {
                if (isInvalidValue(val[k])) return true;
            }
        }
        return false;
    }
    return false;
}

function findInvalidPath(obj, base = "") {
    if (obj === null || obj === undefined) return base || "value";
    if (typeof obj === "string") {
        if (obj.trim() === "") return base || "value";
        return null;
    }

    if (Array.isArray(obj)) {
        for (let i = 0; i < obj.length; i++) {
            const p = findInvalidPath(obj[i], `${base}[${i}]`);
            if (p) return p;
        }
        return null;
    }

    if (typeof obj === "object") {
        for (const k of Object.keys(obj)) {
            const path = base ? `${base}.${k}` : k;
            const p = findInvalidPath(obj[k], path);
            if (p) return p;
        }
        return null;
    }

    return null;
}

export default function validateInputs(req, res, next) {
    try {
        const sources = { params: req.params, query: req.query };

        for (const [sourceName, source] of Object.entries(sources)) {
            const invalidPath = findInvalidPath(source);
            if (invalidPath) {
                return res.status(400).json({
                    success: false,
                    error: `${sourceName} contains invalid value at '${invalidPath}' (null/undefined/empty string)`
                });
            }
        }

        next();
    } catch (err) {
        next(err);
    }
}
