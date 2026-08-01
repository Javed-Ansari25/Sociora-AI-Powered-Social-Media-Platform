import mongoose from "mongoose";

const connectDb = async () => {
    try {
        const connect = await mongoose.connect(`${process.env.DB_URL}/${process.env.DB_NAME}`);
        console.log(`MongoDB Connected !! Host: ${connect.connection.host}`);
    } catch (error) {
        console.log("MONGO_dB CONNECTION FIELD !!", error.message);
        process.exit(1);
    }
}

export default connectDb
