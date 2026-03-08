# Password Protection Documentation

## Overview

CoHive includes password protection on the landing page to prevent unauthorized access to the hexagonal workflow interface.

---

## How It Works

### **Landing Page Login Flow**

1. User visits the application
2. Sees the CoHive landing page with logo
3. Clicks **"Login"** button in top-right corner
4. Password input dialog appears
5. User enters password and clicks **"Submit"** (or presses Enter)
6. If correct → proceeds to hex workflow interface
7. If incorrect → error message shown, password cleared, user tries again

---

## Default Password

**Default:** `cohive2024`

This password is hardcoded as a fallback if no environment variable is set.

---

## Setting a Custom Password

### **Method 1: Environment Variable (Recommended)**

Create a `.env` file in the root directory:

```env
VITE_COHIVE_PASSWORD=your_secure_password_here
```

**Important:** The variable must be prefixed with `VITE_` to be accessible in the frontend.

### **Method 2: Vercel/Production Environment**

When deploying to Vercel or other hosting platforms:

1. Go to your project settings
2. Navigate to **Environment Variables**
3. Add: `VITE_COHIVE_PASSWORD` = `your_secure_password`
4. Redeploy the application

---

## Security Considerations

### **⚠️ Important Notes**

- This is **basic password protection** suitable for internal/demo applications
- The password is checked **client-side only** (not cryptographically secure)
- Anyone with browser dev tools can bypass this protection
- **Do NOT use this for protecting sensitive data or production applications**

### **For Production Use**

If you need secure authentication, consider implementing:

- **OAuth 2.0** (Google, Microsoft, GitHub)
- **Auth0**, **Clerk**, or **Firebase Authentication**
- **Backend session management** with secure cookies
- **JWT tokens** with server-side validation
- **Multi-factor authentication (MFA)**

---

## User Experience

### **Login Button**
- Located in **top-right corner** of landing page
- Purple button with hover effect
- Clicking shows password input dialog

### **Password Dialog**
- Clean white card with purple border
- Password input field (masked text)
- **Submit** button (purple)
- **Cancel** button (gray) - closes dialog and clears password
- Error message shown in red if password is incorrect

### **Keyboard Support**
- Press **Enter** to submit password
- Password field auto-focuses when dialog opens
- **Cancel** clears input and closes dialog

---

## localStorage Persistence

Once logged in successfully:
- A flag is stored: `cohive_logged_in: 'true'`
- User stays logged in until they clear browser data
- Closing/reopening browser maintains logged-in state

### **To Force Logout**

Users must manually clear localStorage:
1. Open browser DevTools (F12)
2. Go to **Application** → **Local Storage**
3. Delete the key: `cohive_logged_in`
4. Refresh the page

---

## Code Location

**Login Component:** `/components/Login.tsx`

Key features:
- State management for password input
- Error handling
- Keyboard event handling (Enter key)
- Cancel functionality
- Environment variable support

---

## Changing the Password

### **Development**

Edit `.env` file:
```env
VITE_COHIVE_PASSWORD=new_password_123
```

Restart development server:
```bash
npm run dev
```

### **Production (Vercel)**

1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Update `VITE_COHIVE_PASSWORD` value
3. Redeploy application (Vercel → Deployments → Redeploy)

---

## Example Passwords

**For different environments:**

```env
# Development
VITE_COHIVE_PASSWORD=dev123

# Staging
VITE_COHIVE_PASSWORD=staging_cohive_2024

# Production
VITE_COHIVE_PASSWORD=YourSecure!Password#2024
```

---

## Troubleshooting

### **Problem:** Password doesn't work

**Solutions:**
1. Check `.env` file exists in project root
2. Verify variable name is exactly `VITE_COHIVE_PASSWORD`
3. Restart dev server after changing `.env`
4. Clear browser cache and localStorage
5. Try default password: `cohive2024`

### **Problem:** Can't change password

**Solutions:**
1. Make sure variable starts with `VITE_` prefix
2. In Vercel, ensure environment variable is set and redeployed
3. Check for typos in variable name

### **Problem:** Dialog doesn't appear

**Solutions:**
1. Check browser console for errors
2. Verify `Login.tsx` component is rendering
3. Check if already logged in (clear localStorage)

---

## Future Enhancements

Potential improvements:
- [ ] Add "Forgot Password?" link
- [ ] Implement backend authentication
- [ ] Add user roles (admin, user, viewer)
- [ ] Session timeout after inactivity
- [ ] Login attempt rate limiting
- [ ] Password complexity requirements
- [ ] Integration with Databricks OAuth

---

**Last Updated:** March 2, 2026
