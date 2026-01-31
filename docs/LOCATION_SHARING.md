# Location Sharing Testing Guide

## Overview

SignalFeed now has **Follow Me mode** - users can share their real-time location with other users while maintaining control over who can see them.

## How It Works

### For Users Sharing Location:

1. **Sign in** to your account
2. Go to **Settings** (click user icon → Settings)
3. Toggle **"Follow Me Mode"** ON
4. Your live location will now be visible to others
5. You'll see a "Sharing location" indicator in the bottom-left corner

### Location Privacy:

- Only users with Follow Me enabled are visible
- You can **block specific users** from seeing your location
- Location sharing stops automatically when:
  - You toggle Follow Me OFF
  - You sign out
  - Location permission is revoked

### Blocking Users:

- Go to your Profile page
- View "Blocked Users" section (coming soon)
- Block/unblock users as needed
- Blocked users cannot see your location even if Follow Me is enabled

## Testing on Localhost

### Geolocation Requirements:

Geolocation API requires HTTPS or localhost to work. On localhost:

**Chrome/Edge:**

- ✅ Works by default on `localhost`
- Browser will prompt for location permission

**Firefox:**

- ⚠️ May need configuration
- Go to `about:config`
- Search for `geo.prompt.testing`
- Set to `true`

**Safari:**

- ⚠️ May require HTTPS even on localhost
- Consider using `ngrok` or similar for HTTPS tunnel

### Testing Steps:

1. **Start the dev server:**

   ```bash
   npm run dev
   ```

2. **Open http://localhost:3000**

3. **Sign in** (use magic link authentication)

4. **Enable Follow Me:**
   - Click user icon (top right)
   - Click "Settings"
   - Toggle "Follow Me Mode" ON
   - Browser will ask for location permission - **click Allow**

5. **Verify tracking:**
   - You should see "Sharing location" indicator in bottom-left
   - Check browser console for "[LocationTracker] Starting location tracking"
   - Open DevTools → Network tab and watch for POST requests to `/api/users/location`

6. **Test with multiple users (different browser or incognito):**
   - Sign in with a different account
   - Enable Follow Me on both accounts
   - Both users should see each other's locations on the map (coming next)

7. **Test blocking:**
   - Use the block API endpoint to block a user
   - Verify blocked users can't see your location

### API Endpoints:

**Settings:**

- `GET /api/users/settings` - Get your settings
- `PATCH /api/users/settings` - Update settings

**Location:**

- `POST /api/users/location` - Update your location (auto-called by tracker)
- `GET /api/users/location` - Get all visible user locations
- `DELETE /api/users/location` - Stop sharing your location

**Blocking:**

- `POST /api/users/location/block` - Block a user
- `GET /api/users/location/block` - Get your blocked list
- `DELETE /api/users/location/block?userId=XYZ` - Unblock a user

### Troubleshooting:

**Location not updating?**

- Check browser console for errors
- Verify location permission is granted (browser address bar icon)
- Try revoking and re-granting permission
- Check Network tab for failed API calls

**"Geolocation is not supported"?**

- Make sure you're on `localhost` not `127.0.0.1`
- Try using HTTPS (ngrok, local SSL cert)
- Check browser compatibility

**Indicator not showing?**

- Toggle Follow Me OFF then ON again
- Refresh the page
- Check if Follow Me is enabled in settings

**Location not persisting after refresh?**

- Location sharing stops when you leave the page
- Re-enable Follow Me mode after refresh
- This is intentional for privacy (user must opt-in each session)

## What's Next:

### Coming Soon:

- [ ] Display user location markers on the map
- [ ] Show other users' locations with Follow Me enabled
- [ ] User profile page with blocked users management
- [ ] Location sharing history
- [ ] Proximity notifications ("User X is nearby!")
- [ ] Follow specific signals/events
- [ ] Group location sharing for events

### Future Enhancements:

- [ ] Battery-efficient location tracking
- [ ] Custom location update intervals
- [ ] Location accuracy indicators
- [ ] Offline location queuing
- [ ] Location-based sighting suggestions

## Security & Privacy:

✅ **What we do:**

- Only share location when explicitly enabled
- Allow blocking of specific users
- Auto-delete stale locations (5 minutes)
- No location history stored
- Follow Me mode doesn't persist (must enable each session)

❌ **What we don't do:**

- Never share location without consent
- Never share to public (only authenticated users with Follow Me)
- No background tracking when app is closed
- No selling or sharing location data with third parties

## Development Notes:

### Architecture:

- **Domain**: `src/domain/users/location-sharing.ts` - Location sharing logic
- **Repository**: In-memory storage (will migrate to database)
- **Component**: `UserLocationTracker` - Continuous location tracking
- **API**: RESTful endpoints for location and blocking

### Data Flow:

1. User enables Follow Me → settings saved
2. `UserLocationTracker` component starts `watchPosition`
3. Every 5 seconds, location POSTed to `/api/users/location`
4. Server stores location with 5-minute TTL
5. Other users GET `/api/users/location` to see visible locations
6. Map component (next step) displays markers

### Performance:

- Location updates: ~every 5 seconds
- GPS accuracy: High accuracy mode enabled
- Network: Non-blocking, fire-and-forget
- Auto-cleanup: Stale locations removed automatically

---

**Questions or issues? Check the browser console for detailed logs!**
