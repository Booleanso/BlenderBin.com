# Pricing Page with Waitlist Feature

This pricing page includes a waitlist overlay feature that can be enabled using environment variables.

## Waitlist Feature

The waitlist overlay will appear on top of the pricing page when enabled, preventing users from directly subscribing to plans and instead prompting them to join a waitlist.

### How to Enable/Disable the Waitlist

1. Set the `NEXT_PUBLIC_WAITLIST` environment variable in your `.env.local` file:

```
# To enable waitlist mode
NEXT_PUBLIC_WAITLIST=true

# To disable waitlist mode (default)
NEXT_PUBLIC_WAITLIST=false
```

2. Restart the Next.js server for the changes to take effect.

### Implementation Details

- The waitlist overlay is implemented in `app/components/WaitlistOverlay.tsx`
- Waitlist submissions are processed by the API endpoint at `app/api/waitlist/route.ts`
- The utility function in `app/utils/waitlist.ts` determines whether the waitlist is enabled
- Waitlist submissions are stored in Firestore in the `waitlist` collection

### Customizing the Waitlist

To customize the appearance or behavior of the waitlist:

1. Modify the `WaitlistOverlay.tsx` component to change the UI
2. Update the `waitlist/route.ts` API endpoint to change how submissions are processed

### Testing

To test the waitlist functionality:

1. Set `NEXT_PUBLIC_WAITLIST=true` in your `.env.local` file
2. Restart the Next.js server
3. Visit the pricing page to see the waitlist overlay
4. Submit a test email to verify the submission process 