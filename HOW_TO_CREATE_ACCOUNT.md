# How to Create an Account in PulseParty

## Quick Start

1. **Open the app** at http://localhost:3000
2. **Click the Account button** (👤 icon) in the top-right header
3. **Choose "Sign up"** in the modal
4. **Fill in your details**:
   - Display Name (your username)
   - Email address
   - Password (min 8 chars, must include uppercase, lowercase, and number)
5. **Check your email** for the verification code
6. **Enter the code** to verify your account
7. **You're done!** Your account is created and you're logged in

## Features

### Guest Users (Default)
- ✅ Automatic guest ID when you open the app
- ✅ Can create and join rooms immediately
- ✅ No email or password required
- ❌ Data lost if browser cleared
- ❌ Can't access from other devices

### Registered Users (After Creating Account)
- ✅ Persistent account across devices
- ✅ Custom display name
- ✅ Saved match history (future feature)
- ✅ Friend lists (future feature)
- ✅ Account recovery via email
- ✅ Cross-device sync

## Account Button

The account button in the header shows:
- **👤 icon** - When you're a guest (click to create account)
- **✓ icon** - When you're logged in (click to view account)

## Password Requirements

Your password must:
- Be at least 8 characters long
- Contain at least one uppercase letter (A-Z)
- Contain at least one lowercase letter (a-z)
- Contain at least one number (0-9)

Example valid passwords:
- `MyPass123`
- `Soccer2024!`
- `PulseParty99`

## Email Verification

After signing up:
1. Check your email inbox (and spam folder)
2. Copy the 6-digit verification code
3. Paste it in the verification screen
4. Click "Verify & Sign In"

If you don't receive the code:
- Click "Resend code" button
- Check your spam/junk folder
- Make sure you entered the correct email

## Switching Between Guest and Account

### From Guest to Account
1. Click the Account button (👤)
2. Sign up with your email
3. Your guest session will be replaced with your new account

### From Account to Guest
1. Currently not supported (you stay logged in)
2. To test guest mode, use incognito/private browsing

## Technical Details

### Authentication Provider
- **AWS Cognito** - Enterprise-grade authentication
- **Secure** - Passwords hashed and encrypted
- **Compliant** - GDPR and SOC 2 compliant

### What's Stored
When you create an account, we store:
- Email address (for login and recovery)
- Display name (shown to other players)
- User ID (unique identifier)
- Password (hashed, never stored in plain text)

### Privacy
- Your email is never shared with other players
- Only your display name is visible in rooms
- You can delete your account anytime (future feature)

## Troubleshooting

### "User already exists"
- This email is already registered
- Try logging in instead of signing up
- Or use a different email address

### "Invalid verification code"
- Make sure you copied the entire code
- Code expires after 24 hours
- Click "Resend code" to get a new one

### "Password does not meet requirements"
- Check password requirements above
- Make sure you have uppercase, lowercase, and number
- Password must be at least 8 characters

### "Network error"
- Check your internet connection
- Make sure AWS credentials are valid
- Check browser console for errors

## Next Steps After Creating Account

Once you have an account:
1. ✅ **Create rooms** - Your rooms are linked to your account
2. ✅ **Join rooms** - Play with friends
3. ✅ **Earn points** - Your stats are saved
4. 🔜 **View history** - See past matches (coming soon)
5. 🔜 **Add friends** - Build your squad (coming soon)
6. 🔜 **Customize profile** - Avatar, bio, etc. (coming soon)

## Demo

Try it now:
1. Open http://localhost:3000
2. Click the 👤 button in the top-right
3. Click "Sign up"
4. Enter your details
5. Check your email for the code
6. Verify and start playing!

Your account is now ready to use across all your devices! 🎉
