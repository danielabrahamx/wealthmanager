import { v4 as uuid } from 'uuid';
import { Router, Request, Response } from 'express';
import { saveUserProfile, getUserProfile, updateFundsDeposited } from '../redis/client.js';
import type { UserTier } from '../../shared/index.js';

export const onboardingRouter = Router();

// Step 1: User selects tier
onboardingRouter.post('/tier', async (req: Request, res: Response) => {
  try {
    const { tier } = req.body as { tier: UserTier };
    
    if (!['beginner', 'intermediate', 'sophisticated'].includes(tier)) {
      res.status(400).json({ error: 'Invalid tier. Choose beginner, intermediate, or sophisticated.' });
      return;
    }

    const userId = uuid();
    const profile = await saveUserProfile(userId, tier);
    
    res.json({ userId, profile });
  } catch (err) {
    console.error('[onboarding] Error saving tier:', err);
    res.status(500).json({ error: 'Failed to save user tier' });
  }
});

// Step 2: User deposits funds
onboardingRouter.post('/deposit', async (req: Request, res: Response) => {
  try {
    const { userId, amount } = req.body as { userId: string; amount: number };
    
    if (!userId || !amount || amount <= 0) {
      res.status(400).json({ error: 'Invalid userId or amount' });
      return;
    }

    const profile = await getUserProfile(userId);
    if (!profile) {
      res.status(404).json({ error: 'User not found. Complete tier selection first.' });
      return;
    }

    await updateFundsDeposited(userId, amount);
    profile.fundsDeposited = amount;
    
    res.json({ profile });
  } catch (err) {
    console.error('[onboarding] Error depositing funds:', err);
    res.status(500).json({ error: 'Failed to deposit funds' });
  }
});

// Get user profile
onboardingRouter.get('/profile/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const profile = await getUserProfile(userId);
    
    if (!profile) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    
    res.json({ profile });
  } catch (err) {
    console.error('[onboarding] Error fetching profile:', err);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});
