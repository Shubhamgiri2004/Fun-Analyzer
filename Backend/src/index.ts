import { Hono } from "hono";
import { cors } from "hono/cors";
import dotenv from "dotenv";
import OpenAI from "openai";
import { serve } from "@hono/node-server";


// dotenv.config
dotenv.config();


type Bindings = {
    OPENAI_API_KEY: string;
};

const app = new Hono<{ Bindings: Bindings }>();

app.use(cors());

const GITHUB_API_URL = "https://api.github.com/users/";


//Now making of interface 
interface GitHubUser {
    login: string,
    bio: string | null;
    public_repos: number;
    followers: number;
    following: number;
}

app.get("/", (c) => {
    return c.text("Hello Jii!");
})

app.get("/analyze/:username", async (c) => {
    const username = c.req.param("username");
    const OPENAI_API_KEY = c.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY;
   

    //condition for checking the api key
    if (!OPENAI_API_KEY) {
        throw new Error("Missing OpenAi api key in the environment variables.");
    }

    const openai = new OpenAI({
        apiKey: OPENAI_API_KEY,
    });

    try {
        const githubRes = await fetch(`${GITHUB_API_URL}${username}`, {
            headers: { "User-Agent": "Hono" },
          });

          
        const githubContribution = await fetch(
            `https://github-contributions-api.jogruber.de/v4/${username}`
        );

        interface ContributionRequest {
            total: object;
        }

        const response = (await githubContribution.json()) as ContributionRequest;
        const contributions = Object.values(response.total);
        const total = contributions.reduce(
            (total, contributions) => total + contributions,
            0
        )

        if (!githubRes.ok) {
            throw new Error(`Github user "${username}" not found.`)
        }

        const githubData = (await githubRes.json()) as GitHubUser;

        const prompt = `
        Here's some information about the Github user:
        -Username: ${githubData.login}
        -Bio: ${githubData.bio || "No Bio Provided"}
        -Public Repos: ${githubData.public_repos}
        -Followers: ${githubData.followers}
        -Following: ${githubData.following}
        
        You have all this information and user is trying to be chill.
        Write a description of this user that is witty, fun and brutal roasty.
        And also rate their Chillness.     
        ` ;

        console.log(prompt);

        //On chat-completion
        const chatCompletion = await openai.chat.completions.create({
            model: "gpt-3.5-turbo",
            messages: [
                {
                    role: "system",
                    content: "You are witty, fun and roasty assistance.",
                },
                {
                    role: "user",
                    content: "prompt"
                }
            ],
            max_tokens: 200,
            temperature: 1,
        });

        const description = chatCompletion.choices[0]?.message?.content?.trim();

        if (!description) {
            throw new Error("Failed to generate the response form Backend.")
        }

        return c.json({
            username: githubData.login,
            description
        });
    } catch (error) {
        console.error("Error details:", error);
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
        return c.json({ error: errorMessage }, 500);
    }

})

serve({
    fetch: app.fetch,
    port: 3000,
});
console.log("server is running on the port 3000");

export default app;














