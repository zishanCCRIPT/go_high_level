import express, { Express } from "express";
import vicidialRoutes from "./routes/vicidialRoutes";
import cors from "cors";


const app: Express = express();
const PORT = 3000;

app.use(cors());


app.use(express.urlencoded({ extended: true }));
app.use(express.json());


// Routes
app.use("/api", vicidialRoutes);

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
