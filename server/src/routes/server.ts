/**
 * Server Management Routes
 * POST /server/register         - Register Discord server (15 MNEE)
 * POST /server/:guildId/deposit - Deposit MNEE to balance
 * POST /server/:guildId/withdraw- Withdraw MNEE
 * GET  /server/:guildId         - Get server info & balance
 */

import { Router } from 'express';
import type { Request, Response } from 'express';
import {
    registerServer,
    depositToServer,
    withdrawFromServer,
    getServerInfo,
    getServerBalance,
    getRegistrationFee,
} from '../services/contractService.js';
import type {
    ApiResponse,
    RegisterServerRequest,
    RegisterServerResponse,
    DepositRequest,
    DepositResponse,
    WithdrawRequest,
    WithdrawResponse,
    ServerData,
} from '../types/index.js';

export const serverRouter = Router();

/**
 * POST /server/register
 * Register a new Discord server (requires 15 MNEE)
 */
serverRouter.post('/register', async (req: Request, res: Response) => {
    try {
        const input = req.body as RegisterServerRequest;

        if (!input.guildId) {
            res.status(400).json({
                success: false,
                error: 'guildId is required',
            } satisfies ApiResponse<never>);
            return;
        }

        if (!input.adminDiscordId) {
            res.status(400).json({
                success: false,
                error: 'adminDiscordId is required',
            } satisfies ApiResponse<never>);
            return;
        }

        const txHash = await registerServer(input.guildId, input.adminDiscordId);
        const registrationFee = await getRegistrationFee();

        res.status(201).json({
            success: true,
            data: {
                guildId: input.guildId,
                txHash,
                message: `Server registered successfully. Registration fee: ${registrationFee} wei`,
            },
        } satisfies ApiResponse<RegisterServerResponse>);
    } catch (error) {
        console.error('Error registering server:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to register server',
        } satisfies ApiResponse<never>);
    }
});

/**
 * POST /server/:guildId/deposit
 * Deposit MNEE to server balance
 */
serverRouter.post('/:guildId/deposit', async (req: Request, res: Response) => {
    try {
        const { guildId } = req.params;
        const input = req.body as DepositRequest;

        if (!guildId) {
            res.status(400).json({
                success: false,
                error: 'guildId is required',
            } satisfies ApiResponse<never>);
            return;
        }

        if (!input.amount) {
            res.status(400).json({
                success: false,
                error: 'amount is required',
            } satisfies ApiResponse<never>);
            return;
        }

        const txHash = await depositToServer(guildId, input.amount);
        const balance = await getServerBalance(guildId);

        res.status(200).json({
            success: true,
            data: {
                txHash,
                amount: input.amount,
                newBalance: balance?.availableBalance || '0',
                message: 'Deposit successful',
            },
        } satisfies ApiResponse<DepositResponse>);
    } catch (error) {
        console.error('Error depositing to server:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to deposit',
        } satisfies ApiResponse<never>);
    }
});

/**
 * POST /server/:guildId/withdraw
 * Withdraw MNEE from server balance
 */
serverRouter.post('/:guildId/withdraw', async (req: Request, res: Response) => {
    try {
        const { guildId } = req.params;
        const input = req.body as WithdrawRequest;

        if (!guildId) {
            res.status(400).json({
                success: false,
                error: 'guildId is required',
            } satisfies ApiResponse<never>);
            return;
        }

        if (!input.to) {
            res.status(400).json({
                success: false,
                error: 'to (recipient address) is required',
            } satisfies ApiResponse<never>);
            return;
        }

        if (!input.amount) {
            res.status(400).json({
                success: false,
                error: 'amount is required',
            } satisfies ApiResponse<never>);
            return;
        }

        const txHash = await withdrawFromServer(guildId, input.to, input.amount);

        res.status(200).json({
            success: true,
            data: {
                txHash,
                amount: input.amount,
                to: input.to,
                message: 'Withdrawal successful',
            },
        } satisfies ApiResponse<WithdrawResponse>);
    } catch (error) {
        console.error('Error withdrawing from server:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to withdraw',
        } satisfies ApiResponse<never>);
    }
});

/**
 * GET /server/:guildId
 * Get server info and balance
 */
serverRouter.get('/:guildId', async (req: Request, res: Response) => {
    try {
        const { guildId } = req.params;

        if (!guildId) {
            res.status(400).json({
                success: false,
                error: 'guildId is required',
            } satisfies ApiResponse<never>);
            return;
        }

        const serverInfo = await getServerInfo(guildId);

        // Handle null (contract error) or unregistered server
        if (!serverInfo || (!serverInfo.isActive && serverInfo.registeredAt === 0)) {
            res.status(404).json({
                success: false,
                error: 'Server not found or contract unavailable',
            } satisfies ApiResponse<never>);
            return;
        }

        res.status(200).json({
            success: true,
            data: serverInfo,
        } satisfies ApiResponse<ServerData>);
    } catch (error) {
        console.error('Error getting server info:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to get server info',
        } satisfies ApiResponse<never>);
    }
});
