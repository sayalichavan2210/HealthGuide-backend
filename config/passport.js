const passport       = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const GitHubStrategy = require("passport-github2").Strategy;
const User           = require("../models/User");
const SERVER_URL = (process.env.SERVER_URL || "https://healthguide-backend.onrender.com").trim();

// ── Google Strategy ───────────────────────────────────────
passport.use(new GoogleStrategy(
  {
    clientID:     process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: `${SERVER_URL}/api/auth/google/callback`,
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      let user = await User.findOne({ googleId: profile.id });
      if (user) return done(null, user);

      user = await User.findOne({ email: profile.emails[0].value });
      if (user) {
        user.googleId     = profile.id;
        user.authProvider = "google";
        if (!user.avatar) user.avatar = profile.photos[0]?.value || "";
        await user.save();
        return done(null, user);
      }

      user = await User.create({
        firstName:    profile.name.givenName  || profile.displayName,
        lastName:     profile.name.familyName || "",
        email:        profile.emails[0].value,
        googleId:     profile.id,
        avatar:       profile.photos[0]?.value || "",
        authProvider: "google",
        isVerified:   true,
      });

      return done(null, user);
    } catch (err) {
      return done(err, null);
    }
  }
));

// ── GitHub Strategy ───────────────────────────────────────
passport.use(new GitHubStrategy(
  {
    clientID:     process.env.GITHUB_CLIENT_ID,
    clientSecret: process.env.GITHUB_CLIENT_SECRET,
    callbackURL: `${SERVER_URL}/api/auth/github/callback`,
    scope:        ["user:email"],
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      const email = profile.emails?.[0]?.value || `${profile.username}@github.noemail`;

      // githubId se dhundho
      let user = await User.findOne({ githubId: profile.id });
      if (user) return done(null, user);

      // Email se dhundho
      user = await User.findOne({ email });
      if (user) {
        user.githubId     = profile.id;
        user.authProvider = "github";
        if (!user.avatar) user.avatar = profile.photos[0]?.value || "";
        await user.save();
        return done(null, user);
      }

      const nameParts = (profile.displayName || profile.username || "GitHub User").split(" ");
      user = await User.create({
        firstName:    nameParts[0] || "GitHub",
        lastName:     nameParts.slice(1).join(" ") || "User",
        email,
        githubId:     profile.id,
        avatar:       profile.photos[0]?.value || "",
        authProvider: "github",
        isVerified:   true,
      });

      return done(null, user);
    } catch (err) {
      return done(err, null);
    }
  }
));

passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (err) {
    done(err, null);
  }
});