import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors"
import helmet from "helmet";

const app = express();
app.use(helmet());

app.use(cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true
}))

app.use(express.json({limit: "16mb"}))
app.use(express.urlencoded({extended: true, limit: "16mb"}))
app.use(cookieParser())
app.use(express.static("Public"))

// import route


// route declaration


// Global Error Handler 
app.use((err, req, res, next) => {
  const statuscode = err.statuscode || 500;

  return res.status(statuscode).json({
    success: false,
    statuscode,
    message: err.message || "Internal Server Error",
    errors: err.errors || []
  })
})

export default app