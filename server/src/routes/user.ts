/**
 * User Routes - Username to Wallet Address Mapping
 * POST /user             - Register/update user mapping
 * GET  /user/:username   - Get wallet by username
 * GET  /user/wallet/:address - Get username by wallet
 * DELETE /user/:username - Remove user mapping
 */

import { Router } from 'express';
import type { Request, Response } from 'express';
import { User } from '../models/User.js';
import { isMongoDBConnected } from '../services/mongoService.js';
import type { ApiResponse } from '../types/index.js';

export const userRouter = Router();

// Middleware to check MongoDB connection
userRouter.use((req, res, next) => {
    if (!isMongoDBConnected()) {
        res.status(503).json({
            success: false,
            error: 'Database not available',
        } satisfies ApiResponse<never>);
        return;
    }
    next();
});

interface UserData {
    username: string;
    walletAddress: string;
    discordId: string | undefined;
    createdAt: Date;
    updatedAt: Date;
}

/**
 * POST /user
 * Register or update a username-wallet mapping
 */
userRouter.post('/', async (req: Request, res: Response) => {
    try {
        const { username, walletAddress, discordId } = req.body as {
            username?: string;
            walletAddress?: string;
            discordId?: string;
        };

        if (!username) {
            res.status(400).json({
                success: false,
                error: 'username is required',
            } satisfies ApiResponse<never>);
            return;
        }

        if (!walletAddress) {
            res.status(400).json({
                success: false,
                error: 'walletAddress is required',
            } satisfies ApiResponse<never>);
            return;
        }

        // Validate wallet address format
        if (!/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
            res.status(400).json({
                success: false,
                error: 'Invalid wallet address format',
            } satisfies ApiResponse<never>);
            return;
        }

        // Upsert user
        const user = await User.findOneAndUpdate(
            { username: username.toLowerCase() },
            {
                username: username.toLowerCase(),
                walletAddress,
                discordId,
            },
            { upsert: true, new: true, runValidators: true }
        );

        res.status(200).json({
            success: true,
            data: {
                username: user.username,
                walletAddress: user.walletAddress,
                discordId: user.discordId,
                createdAt: user.createdAt,
                updatedAt: user.updatedAt,
            },
        } satisfies ApiResponse<UserData>);
    } catch (error) {
        console.error('Error registering user:', error);

        // Handle duplicate key error
        if (error instanceof Error && error.message.includes('duplicate')) {
            res.status(409).json({
                success: false,
                error: 'Username already exists',
            } satisfies ApiResponse<never>);
            return;
        }

        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to register user',
        } satisfies ApiResponse<never>);
    }
});

/**
 * GET /user/discord/:discordId
 * Get wallet by Discord user ID
 */
userRouter.get('/discord/:discordId', async (req: Request, res: Response) => {
    try {
        const { discordId } = req.params;

        if (!discordId) {
            res.status(400).json({
                success: false,
                error: 'discordId is required',
            } satisfies ApiResponse<never>);
            return;
        }

        const user = await User.findOne({ discordId });

        if (!user) {
            res.status(404).json({
                success: false,
                error: 'User not found for this Discord ID',
            } satisfies ApiResponse<never>);
            return;
        }

        res.status(200).json({
            success: true,
            data: {
                username: user.username,
                walletAddress: user.walletAddress,
                discordId: user.discordId,
                createdAt: user.createdAt,
                updatedAt: user.updatedAt,
            },
        } satisfies ApiResponse<UserData>);
    } catch (error) {
        console.error('Error getting user by Discord ID:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to get user',
        } satisfies ApiResponse<never>);
    }
});

/**
 * GET /user/wallet/:address
 * Get username by wallet address
 */
userRouter.get('/wallet/:address', async (req: Request, res: Response) => {
    try {
        const { address } = req.params;

        if (!address) {
            res.status(400).json({
                success: false,
                error: 'address is required',
            } satisfies ApiResponse<never>);
            return;
        }

        const user = await User.findOne({ walletAddress: address });

        if (!user) {
            res.status(404).json({
                success: false,
                error: 'User not found for this wallet',
            } satisfies ApiResponse<never>);
            return;
        }

        res.status(200).json({
            success: true,
            data: {
                username: user.username,
                walletAddress: user.walletAddress,
                discordId: user.discordId,
                createdAt: user.createdAt,
                updatedAt: user.updatedAt,
            },
        } satisfies ApiResponse<UserData>);
    } catch (error) {
        console.error('Error getting user by wallet:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to get user',
        } satisfies ApiResponse<never>);
    }
});

/**
 * GET /user/:username
 * Get wallet address by username (MUST be after /discord and /wallet routes!)
 */
userRouter.get('/:username', async (req: Request, res: Response) => {
    try {
        const { username } = req.params;

        if (!username) {
            res.status(400).json({
                success: false,
                error: 'username is required',
            } satisfies ApiResponse<never>);
            return;
        }

        const user = await User.findOne({ username: username.toLowerCase() });

        if (!user) {
            res.status(404).json({
                success: false,
                error: 'User not found',
            } satisfies ApiResponse<never>);
            return;
        }

        res.status(200).json({
            success: true,
            data: {
                username: user.username,
                walletAddress: user.walletAddress,
                discordId: user.discordId,
                createdAt: user.createdAt,
                updatedAt: user.updatedAt,
            },
        } satisfies ApiResponse<UserData>);
    } catch (error) {
        console.error('Error getting user:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to get user',
        } satisfies ApiResponse<never>);
    }
});

/**
 * DELETE /user/:username
 * Remove a user mapping
 */
userRouter.delete('/:username', async (req: Request, res: Response) => {
    try {
        const { username } = req.params;

        if (!username) {
            res.status(400).json({
                success: false,
                error: 'username is required',
            } satisfies ApiResponse<never>);
            return;
        }

        const result = await User.deleteOne({ username: username.toLowerCase() });

        if (result.deletedCount === 0) {
            res.status(404).json({
                success: false,
                error: 'User not found',
            } satisfies ApiResponse<never>);
            return;
        }

        res.status(200).json({
            success: true,
            data: { message: `User '${username}' deleted successfully` },
        } satisfies ApiResponse<{ message: string }>);
    } catch (error) {
        console.error('Error deleting user:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to delete user',
        } satisfies ApiResponse<never>);
    }
});

/**
 * GET /user
 * List all users (with pagination)
 */
userRouter.get('/', async (req: Request, res: Response) => {
    try {
        const limit = Math.min(100, parseInt(req.query['limit'] as string) || 50);
        const skip = parseInt(req.query['skip'] as string) || 0;

        const users = await User.find()
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean();

        const total = await User.countDocuments();

        res.status(200).json({
            success: true,
            data: {
                users: users.map(u => ({
                    username: u.username,
                    walletAddress: u.walletAddress,
                    discordId: u.discordId,
                    createdAt: u.createdAt,
                    updatedAt: u.updatedAt,
                })),
                pagination: {
                    total,
                    limit,
                    skip,
                    hasMore: skip + users.length < total,
                },
            },
        });
    } catch (error) {
        console.error('Error listing users:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to list users',
        } satisfies ApiResponse<never>);
    }
});
