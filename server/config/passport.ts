import passport from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Strategy as FacebookStrategy } from 'passport-facebook';
import bcrypt from 'bcryptjs';
import { storage } from '../storage.js';

// Serialize user for session
passport.serializeUser((user: any, done) => {
  done(null, user.id);
});

// Deserialize user from session
passport.deserializeUser(async (id: number, done) => {
  try {
    const user = await storage.getUserById(id);
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

// Local Strategy for email/password login
passport.use(new LocalStrategy(
  {
    usernameField: 'email',
    passwordField: 'password'
  },
  async (email, password, done) => {
    try {
      const user = await storage.getUserByEmail(email);
      if (!user) {
        return done(null, false, { message: 'Invalid email or password' });
      }

      const isValidPassword = await bcrypt.compare(password, user.passwordHash);
      if (!isValidPassword) {
        return done(null, false, { message: 'Invalid email or password' });
      }

      return done(null, user);
    } catch (error) {
      return done(error);
    }
  }
));

// Google OAuth Strategy
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  passport.use(new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: '/auth/google/callback'
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        // Check if user already exists
        let user = await storage.getUserByEmail(profile.emails?.[0]?.value || '');
        
        if (!user) {
          // Create new user
          user = await storage.createUser({
            email: profile.emails?.[0]?.value || '',
            name: profile.displayName || '',
            googleId: profile.id,
            profilePicture: profile.photos?.[0]?.value,
            isEmailVerified: true // Google accounts are pre-verified
          });
        } else if (!user.googleId) {
          // Link Google account to existing user
          await storage.updateUser(user.id, { googleId: profile.id });
        }

        return done(null, user);
      } catch (error) {
        return done(error);
      }
    }
  ));
}

// Facebook OAuth Strategy
if (process.env.FACEBOOK_APP_ID && process.env.FACEBOOK_APP_SECRET) {
  passport.use(new FacebookStrategy(
    {
      clientID: process.env.FACEBOOK_APP_ID,
      clientSecret: process.env.FACEBOOK_APP_SECRET,
      callbackURL: '/auth/facebook/callback',
      profileFields: ['id', 'emails', 'name', 'picture']
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        // Check if user already exists
        let user = await storage.getUserByEmail(profile.emails?.[0]?.value || '');
        
        if (!user) {
          // Create new user
          user = await storage.createUser({
            email: profile.emails?.[0]?.value || '',
            name: `${profile.name?.givenName} ${profile.name?.familyName}` || '',
            facebookId: profile.id,
            profilePicture: profile.photos?.[0]?.value,
            isEmailVerified: true // Facebook accounts are pre-verified
          });
        } else if (!user.facebookId) {
          // Link Facebook account to existing user
          await storage.updateUser(user.id, { facebookId: profile.id });
        }

        return done(null, user);
      } catch (error) {
        return done(error);
      }
    }
  ));
}

export default passport;