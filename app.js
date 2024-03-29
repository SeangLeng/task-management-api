const express = require('express');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const randToken = require('rand-token');
const { Pool } = require('pg');
const bodyParser = require('body-parser');
const cors = require('cors');
const authMiddleware = require('./authMiddleware/MiddleWare');


const app = express();
const port = 8080;
const baseUrl = '/api/v1';
app.use(cors());

// Database connection
const client = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'taskManagement',
    password: 'password',
    port: 5432,
});

app.use(express.json());

// Registration route
app.post(`${baseUrl}/register`, async (req, res) => {
    const { username, email, password } = req.body;
    const uuid = crypto.randomUUID();
    const id = Math.floor(Math.random() * 100) + 1;
    const roles = 2;

    try {
        // Hash the password using bcrypt
        const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

        const register = await client.query(
            'INSERT INTO "user" (username, email, password, roles, userid) VALUES ($1, $2, $3, $4, $5)',
            [username, email, hashedPassword, roles, id]
        );

        const role_json = await client.query('SELECT * FROM roles WHERE id = $1', [roles]);

        res.status(200).json({
            code: 200,
            message: 'Registered successfully!',
            data: {
                username: username,
                email: email,
                roles: role_json.rows,
            },
        });
    } catch (err) {
        res.status(500).json({
            message: err.message,
            code: 500,
        });
    }
});

const SECRET = "SECRET_PARA_ENCRYPTACTION";
const SALT_ROUNDS = 10; // Number of bcrypt hashing rounds

app.post(`${baseUrl}/login`, async (req, res) => {
    const { email, password } = req.body;

    try {
        const { rows } = await client.query('SELECT * FROM "user" WHERE email = $1', [email]);

        if (rows.length > 0) {
            const user = rows[0];
            const passwordMatch = await bcrypt.compare(password, user.password);

            if (passwordMatch) {
                const accessToken = jwt.sign({ id: user.id, email, name: user.username, roles: user.roles }, SECRET, { expiresIn: '1h' });
                const refreshToken = randToken.uid(256);

                // Store refresh token securely, e.g., in a database
                // For simplicity, it's stored in-memory in this example
                // Consider using a database or an in-memory store for production
                // Also, consider hashing or encrypting refresh tokens
                // Ensure that you handle token expiration and refresh logic securely
                refreshToken[refreshToken] = { id: user.id, email: user.email, name: user.username, roles: user.roles };

                res.json({
                    user: { id: user.userid, email, name: user.username, roles: user.roles },
                    accessToken: accessToken,
                    refreshToken: refreshToken,
                });
            } else {
                res.status(401).json({ message: 'Invalid credentials' });
            }
        } else {
            res.status(401).json({ message: 'User not found' });
        }
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({
            message: 'Internal error',
            code: 500,
        });
    }
});

app.get(`${baseUrl}/auth/me`, authMiddleware, async (req, res) => {
    const roles = await client.query('SELECT * FROM "roles" WHERE id = $1', [req.user.roles])
    const userDetails = {
        code: 200,
        id: user.user.id,
        name: req.user.name,
        email: req.user.email,
        roles: roles.rows,
    };
    res.json(userDetails);
});


// Tasks

app.get(`${baseUrl}/allTaskByUserId/:id`, async (req, res) => {
    const userId = req.params.id;
    try {
        const tasks = await client.query('SELECT * FROM "tasks" WHERE userid = $1 ORDER BY id DESC', [userId]);

        res.json({
            code: 200,
            message: 'Tasks for user with id ' + userId + ' retrieved successfully',
            tasks: tasks.rows,
        });
    } catch (err) {
        console.error("Error retrieving tasks:", err);
        res.status(500).json({
            message: "Error retrieving tasks",
            code: 500,
        });
    }
});


app.post(`${baseUrl}/createTasks`, async (req, res) => {
    const { userid, title } = req.body;

    try {
        const currentDate = new Date();
        const newTasks = await client.query('INSERT INTO "tasks" (userid, title, date) VALUES ($1, $2, $3)', [userid, title, currentDate]);

        res.json({
            message: `${title} tasks were successfully created`,
            code: 201,
        });
    } catch (err) {
        console.error("Error creating tasks:", err);
        res.status(500).json({ message: "Error creating tasks", code: 500 });
    }
});



app.delete(`${baseUrl}/deleteTask/:id`, async (req, res) => {
    const taskId = req.params.id;

    try {
        const result = await client.query('DELETE FROM "tasks" WHERE id = $1', [taskId]);

        if (result.rowCount === 1) {
            res.json({
                message: "Task deleted successfully",
                code: 200,
            });
        } else {
            res.status(404).json({
                message: "Task not found",
                code: 404,
            });
        }
    } catch (err) {
        console.error("Error deleting task:", err);
        res.status(500).json({
            message: "Error deleting task",
            code: 500,
        });
    }
});

app.get(`${baseUrl}/detailTask/:userid/:id`, async (req, res) => {
    const taskId = req.params.id;
    const userId = req.params.userid;

    try {
        const result = await client.query('SELECT * FROM "TaskDetail" WHERE taskid = $1 AND userid = $2', [taskId, userId]);

        if (result.rows.length === 0) {
            // Handle the case when no task is found with the given taskId and userId
            res.status(404).json({ message: 'Task not found' });
            return;
        }

        const task = result.rows;

        res.json({
            code: 200,
            message: 'Task details retrieved successfully',
            task,
        });
    } catch (err) {
        console.error("Error retrieving task details:", err);
        res.status(500).json({
            message: 'Internal Server Error',
            error: err.message,
        });
    }
});

app.post(`${baseUrl}/newTaskRequest`, async (req, res) => {
    const { userid, taskid, title, isprocessing, request, complete } = req.body;
    try {
        const currentDate = new Date();
        const newTask = await client.query('INSERT INTO "TaskDetail" (userid, title, taskid, isprocessing, request, complete, date, detailtask) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)', [userid, title, taskid, isprocessing, request, complete, currentDate, "<p>Write your task details</p>"]);
        res.status(200).json({
            code: 200,
            message: `sucessfully add ${title} request`,
        })
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
})

app.delete(`${baseUrl}/deleteTaskByEditorId/:id`, async (req, res) => {
    const editorId = req.params.id;
    try {
        const deleteTaskResult = await client.query('DELETE FROM "TaskDetail" WHERE editor = $1 RETURNING *', [editorId]);

        if (deleteTaskResult.rows.length === 0) {
            // Handle the case when no tasks are found for the given editorId
            res.status(404).json({ message: 'No tasks found for the given editorId' });
            return;
        }

        const deletedTasks = deleteTaskResult.rows;

        res.json({
            code: 200,
            message: 'Tasks deleted successfully',
            deletedTasks,
        });
    } catch (err) {
        console.error("Error deleting tasks:", err);
        res.status(500).json({ message: 'Internal Server Error', error: err.message });
    }
});

app.put(`${baseUrl}/SaveTaskDetail/:editorId`, async (req, res) => {
    const editorId = req.params.editorId;
    const { content } = req.body;
    try {
        const editContent = await client.query('UPDATE "TaskDetail" SET detailtask = $1 WHERE editor = $2', [content, editorId]);
        res.status(200).json({ content: "content created successfully", code: 200 });
    } catch (err) {
        res.status(500).json({ message: 'Internal Server Error', err: err.message });
    }
})

app.get(`${baseUrl}/findTaskDetail/:editorId`, async (req, res) => {
    const editorId = req.params.editorId;
    try {
        const editContent = await client.query('SELECT detailtask FROM "TaskDetail" WHERE editor = $1', [editorId]);
        res.status(200).json({ content: editContent.rows[0], code: 200 });
    } catch (err) {
        res.status(500).json({ message: 'Internal Server Error', err: err.message });
    }
})



app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});

// Close the database connection when the application is terminated
process.on('SIGINT', async () => {
    await client.end();
    process.exit();
});
