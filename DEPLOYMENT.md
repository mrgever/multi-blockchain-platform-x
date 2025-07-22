# Production Deployment Guide

## Quick Setup to Fix 503 Errors

Your site is live at: https://xbucks.netlify.app

**Critical Issue**: The serverless functions are returning 503 errors because environment variables are not configured in Netlify.

### Immediate Fix Required:

1. **Go to Netlify Dashboard**: https://app.netlify.com
2. **Find your site**: xbucks.netlify.app
3. **Go to**: Site settings → Environment variables
4. **Add these MINIMUM variables**:

```
ALCHEMY_API_KEY=UckD71aWHI5luV-VEtJsl7
NODE_ENV=production
```

### Optional but Recommended Variables:

```bash
# For full functionality, add these too:
FAUNA_SECRET_KEY=your_fauna_key          # Get from https://fauna.com
STRIPE_SECRET_KEY=sk_test_your_key       # Get from https://stripe.com  
SENTRY_DSN=https://your-dsn@sentry.io    # Get from https://sentry.io
JWT_SECRET=any_random_256_bit_string     # Generate a secure random string
```

### After Adding Variables:

1. **Trigger a new deploy**: Go to Deploys tab → Trigger deploy → Deploy site
2. **Wait 2-3 minutes** for deployment to complete
3. **Test the functions**:
   - https://xbucks.netlify.app/.netlify/functions/health
   - https://xbucks.netlify.app/.netlify/functions/rates

## Current Status:

✅ **Fixed**: Content Security Policy for stylesheets  
✅ **Fixed**: Invalid HTML meta tags  
⚠️ **Needs**: Environment variables in Netlify  
⚠️ **Needs**: Database setup (optional for basic testing)

## Testing Without Full Setup:

Even without database setup, the platform will work for:
- ✅ Live crypto prices
- ✅ Wallet connection UI
- ✅ Payment creation UI  
- ✅ System health checks

The UI is now fully functional - you just need to add the environment variables!