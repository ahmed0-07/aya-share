import passport from "passport";
import { Strategy as GoogleStrategy, type Profile, type VerifyCallback } from "passport-google-oauth20";
import config  from "./env.js";
import prisma from "./prisma.js";


passport.use(new GoogleStrategy({
    clientID: config.GOOGLE_CLIENT_ID!,
    clientSecret: config.GOOGLE_CLIENT_SECRET!,
    callbackURL: config.GOOGLE_CALLBACK_URL
},
    async (accessToken: string, refreshToken: string, profile: Profile, done: VerifyCallback) => {
        try{
            const email = profile.emails?.[0]?.value;

            if(!email){
                return done(new Error("No email found in Google profile"), undefined);
            }

            let user = await prisma.user.findUnique({
                where: {
                    googleId: profile.id
                }
            });

            if(!user){
                user = await prisma.user.create({
                    data: {
                        name: profile.displayName,
                        email: email,
                        googleId: profile.id,
                    }
                });
            }

            return done(null, user);
        }
        catch(error){
            return done(error, undefined);
        }
    }
))