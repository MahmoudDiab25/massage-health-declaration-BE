import jwt, { JwtPayload } from 'jsonwebtoken';
const JWT_SECRET = process.env.JWT_SECRET || '';

export function getUserIdFromToken(authorizationHeader: string): number | null {
    const token = authorizationHeader.slice(7); // Remove 'Bearer ' from the beginning

    try {
        // Verify the token
        const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
        const userId = decoded.user.id;

        return userId;
    } catch (error) {
        console.error('Invalid or expired token:', error);
        return null;
    }
}

export function filterFields<T extends object>(
    data: Partial<T>,
    allowedFields?: (keyof T)[],
): Partial<T> {
    // If no fields are restricted, return the original data as-is
    if (!allowedFields || allowedFields.length === 0) {
        return data;
    }

    const filtered: Partial<T> = {};
    for (const key of allowedFields) {
        if (key in data) {
            filtered[key] = data[key];
        }
    }
    return filtered;
}
