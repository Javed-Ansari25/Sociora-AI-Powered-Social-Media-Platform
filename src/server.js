import dotenv from "dotenv"
import app from "./app.js";
import connectDb from "./config/database.js";
dotenv.config();

connectDb()
.then(() => {
    app.listen(process.env.PORT || 3000, () => {
        console.log(`SERVER RUNNING ON ${process.env.PORT}`);   
    })
})
.catch((err) => {
    console.log("MONGO_DB CONNECTION FIELD", err);
})
