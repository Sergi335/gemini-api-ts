# API Codebase Overview

This document provides a comprehensive overview of the API codebase, detailing its structure, components, and functionalities. It is designed to serve as a guide for understanding and replicating the project.

## 1. Project Setup

### Dependencies

The project uses Node.js and Express.js. Key dependencies are managed via `package.json`.

**Production Dependencies:**
*   `axios`: Promise based HTTP client for the browser and node.js.
*   `cheerio`: Fast, flexible, and lean implementation of core jQuery specifically designed for the server.
*   `cookie-parser`: Parse Cookie header and populate `req.cookies` with an object keyed by the cookie names.
*   `cross-env`: Set environment variables across platforms.
*   `dotenv`: Loads environment variables from a `.env` file.
*   `express`: Fast, unopinionated, minimalist web framework for Node.js.
*   `firebase`: Firebase JavaScript SDK.
*   `firebase-admin`: Firebase Admin SDK for Node.js.
*   `mongoose`: MongoDB object modeling for Node.js.
*   `multer`: Node.js middleware for handling `multipart/form-data`.
*   `nodemon`: Monitors for any changes in your source and automatically restarts your server.
*   `zod`: TypeScript-first schema declaration and validation library.

### Environment Variables

The application relies on environment variables, typically defined in a `.env` file. These include:
*   `PORT`: Port for the server to listen on (default: 3000).
*   `DB_URI`: MongoDB connection URI for production.
*   `DB_URI_TEST`: MongoDB connection URI for testing.
*   `NODE_ENV`: Application environment (e.g., `production`, `test`).
*   Firebase Admin SDK credentials (e.g., `FBADMIN_TYPE`, `FBADMIN_PROJECT_ID`, `FBADMIN_PRIVATE_KEY_ID`, `FBADMIN_PRIVATE_KEY`, `FBADMIN_CLIENT_EMAIL`, `FBADMIN_CLIENT_ID`, `FBADMIN_AUTH_URI`, `FBADMIN_TOKEN_URI`, `FBADMIN_AUTH_PROV_509`, `FBADMIN_CLIENT_509`, `FBADMIN_UNIVERSE_DOM`).
*   Firebase Client SDK credentials (e.g., `FB_API_KEY`, `FB_AUTH_DOMAIN`, `FB_PROJECT_ID`, `FB_STORAGE_BUCKET`, `FB_MESSAGING_ID`, `FB_APP_ID`).
*   `ADMIN_EMAIL`: Email for the admin user (no storage limit).
*   `MAX_USER_QUOTA`: Maximum storage quota for users.
*   `TEST_USER`: User email for testing purposes.

## 2. Application Entry Point (`app.ts`)

The `app.ts` file is the main entry point of the application. It sets up the Express server, configures middleware, connects to the database, and defines API routes.

*   **Imports:** Essential modules like `express`, `dotenv`, `cookie-parser`, database connection, controllers, and middleware.
*   **Express App Initialization:** `export const app = Express()`.
*   **Middleware Configuration:**
    *   `cors`: Handles Cross-Origin Resource Sharing.
    *   `Express.json()`: Parses incoming JSON requests.
    *   `cookieParser()`: Parses cookies attached to the client request object.
    *   `attachCsrfToken`: Custom middleware for CSRF token handling (though its current implementation sends a CSRF token and calls `next()`, it doesn't fully implement CSRF protection).
*   **Conditional Route Handling:** Routes are conditionally applied based on `NODE_ENV`. In `test` environment, `checkUserSession` middleware is skipped for most routes.
*   **Database Connection:** `dbConnect()` is called to establish a connection to MongoDB.
*   **Server Start:** The Express app listens on the specified `PORT`.

## 3. Database Configuration (`config/mongodb.ts`)

This file handles the MongoDB connection using Mongoose.

*   `dbConnect()`: Connects to MongoDB using `mongoose.connect()`. It selects the connection string (`DB_URI` or `DB_URI_TEST`) based on `NODE_ENV`.

## 4. Middleware

Middleware functions are used to process requests before they reach the route handlers.

*   `middlewares/cors.ts`:
    *   `cors(req, res, next)`: Configures CORS headers, allowing requests from a predefined list of `ACCEPTED_ORIGINS`. It handles preflight `OPTIONS` requests.
*   `middlewares/limitStorage.ts`:
    *   `limitStorage(req, res, next)`: Checks and limits user storage quota for file uploads. It bypasses the limit for the `ADMIN_EMAIL`.
*   `middlewares/session.ts`:
    *   `attachCsrfToken(route, cookieName, csrfToken)`: Sets a CSRF token in the response (currently sends it in the response body and calls `next()`).

## 5. Models (Mongoose Schemas and Logic)

The `models` directory contains Mongoose schemas and corresponding model logic for interacting with the MongoDB database.

### Schemas (`models/schemas/`)

*   `categorySchema.ts`: Defines the schema for a category, replacing `columnSchema.ts` and `desktopSchema.ts`.
    *   Fields: `name` (String), `parentCategory` (String, optional, references another category's ID), `user` (String), `order` (Number), `level` (Number, indicating depth in the hierarchy).
*   `linkSchema.ts`: Defines the schema for a link.
    *   Fields: `name`, `description`, `URL`, `imgURL`, `categoryId` (String, references a category's ID, replacing `escritorio` and `idpanel`), `order` (Number), `user`, `notes`, `images` (array of URLs), `bookmark`, `bookmarkOrder`, `readlist`.
*   `userSchema.ts`: Defines the schema for a user.
    *   Fields: `name`, `realName`, `email`, `password`, `newUser`, `profileImage`, `signMethod`, `googleId`, `website`, `aboutMe`, `lastBackupUrl`, `quota`.

### Model Logic (`models/`)

*   `categoryModel.ts`: This new model will replace `columnModel.ts` and `desktopModel.ts`.
    *   `createCategory({ user, cleanData })`: Creates a new category.
    *   `updateCategory({ user, id, cleanData })`: Updates a category's properties, including moving it under a different parent.
    *   `deleteCategory({ user, id })`: Deletes a category and all its child categories and associated links.
    *   `getAllCategories({ user })`: Retrieves all categories for a user, potentially with filtering by parent or level.
    *   `getTopLevelCategories({ user })`: Retrieves categories without a parent.
    *   `getChildCategories({ user, parentId })`: Retrieves child categories for a given parent.
    *   `setCategoryOrder({ user, categoryId, newOrder })`: Updates the order of a category within its siblings.
    *   `createDummyContent({ user })`: Populates the database with dummy category and link data for a given user.
    *   `deleteUserData({ user })`: Deletes all user-related data (categories, links, and user record).
*   `linkModel.ts`:
    *   `getAllLinks({ user })`: Retrieves all links for a user, sorted by order.
    *   `getLinkById({ user, id })`: Retrieves a single link by ID.
    *   `getLinksByCategory({ user, categoryId })`: Retrieves links for a specific category (replaces `getLinksByDesktop` and `getLinksByColumn`).
    *   `getLinksCount({ user, categoryId })`: Counts links for a user, optionally filtered by category.
    *   `createLink({ cleanData })`: Creates a new link.
    *   `updateLink({ id, oldCategoryId, cleanData, newCategoryId })`: Updates a link's properties, including moving it between categories.
    *   `bulkMoveLinks({ user, sourceCategoryId, destinyCategoryId, links })`: Moves multiple links between categories.
    *   `deleteLink({ user, linkId })`: Deletes one or more links. Reorders remaining links in the category.
    *   `findDuplicateLinks({ user })`: Finds duplicate links based on URL for a user.
    *   `setImagesInDb(url, user, linkId)`: Adds an image URL to a link's `images` array.
    *   `deleteImageOnDb(url, user, linkId)`: Removes an image URL from a link's `images` array.
    *   `setLinkImgInDb(url, user, linkId)`: Sets the `imgURL` for a link.
    *   `searchLinks({ user, query })`: Searches links by name, URL, or notes for a user.
    *   `setBookMarksOrder({ user, links })`: Updates the `bookmarkOrder` for a list of links.
    *   `sortLinks({ categoryId, elements })`: Reorders links within a specific category.
*   `userModel.ts`:
    *   `createUser({ user })`: Creates a new user.
    *   `getUser({ email })`: Retrieves user information by email.
    *   `editUser({ email, user })`: Edits user properties.
    *   `deleteUser({ email })`: Deletes a user record.
    *   `updateProfileImage(url, user)`: Updates a user's profile image URL.

## 6. Controllers

Controllers contain the business logic for handling API requests.

*   `authController.ts`: Handles user authentication and session management.
    *   `usersController.googleLogin`: Handles Google login/registration.
    *   `usersController.getLoggedUserInfo`: Retrieves logged-in user's info.
    *   `usersController.setLoggedUserInfo`: Registers a new user with email/password.
    *   `usersController.editUserInfo`: Edits user profile information.
    *   `usersController.handleLogout`: Clears session cookie.
    *   `usersController.deleteUserInfo`: Deletes user data and files.
    *   `sessionCookieMiddleware`: Creates and sets session cookies after Firebase authentication.
    *   `checkUserSession`: Middleware to verify user session cookie.
    *   `handleEmailVerification`: (Placeholder) For email verification.
*   `categoriesController.ts`: This new controller will replace `columnsController.ts` and `desktopsController.ts`.
    *   `getAllCategories`, `getTopLevelCategories`, `getChildCategories`, `createCategory`, `updateCategory`, `deleteCategory`, `setCategoryOrder`.
*   `linksController.ts`: Manages link-related operations.
    *   `getAllLinks`, `getLinkById`, `getLinksByCategory` (updated), `getLinksCount` (updated), `createLink`, `updateLink`, `bulkMoveLinks` (updated), `getLinkNameByUrl`, `getLinkStatus`, `findDuplicateLinks`, `setBookMarksOrder`, `sortLinks` (updated).
*   `searchController.ts`: Handles search functionality.
    *   `searchController.searchLinks`: Searches for links based on a query.
*   `storageController.ts`: Manages file storage (Firebase Storage).
    *   `getBackgroundsMiniatures`, `uploadImage`, `deleteImage`, `uploadIcon`, `deleteIcon`, `getLinkIcons`, `getBackgroundUrl`, `getUserBackup`, `createUserBackup`, `restoreUserBackup`, `uploadProfileImage`, `deleteAllUserFiles`.

## 7. Routes

The `routes` directory defines the API endpoints and maps them to controller functions.

*   `routes/auth/auth.ts`:
    *   `POST /auth/login`
    *   `POST /auth/googlelogin`
    *   `POST /auth/register`
    *   `POST /auth/logout`
    *   `PATCH /auth/updateuser`
    *   `DELETE /auth/deleteuser`
*   `routes/categories/categories.ts`: This new route file will replace `routes/columns/columns.ts` and `routes/desktops/desktops.ts`.
    *   `GET /categories`
    *   `GET /categories/top-level`
    *   `GET /categories/:parentId/children`
    *   `POST /categories`
    *   `PATCH /categories`
    *   `PATCH /categories/setorder`
    *   `DELETE /categories`
*   `routes/links/links.ts`:
    *   `GET /links`
    *   `GET /links/getbyid/:id`
    *   `GET /links/category` (updated to use categoryId)
    *   `GET /links/count` (updated to use categoryId)
    *   `GET /links/getname`
    *   `GET /links/status`
    *   `GET /links/duplicates`
    *   `POST /links`
    *   `PATCH /links`
    *   `PATCH /links/move` (updated to use categoryIds)
    *   `PATCH /links/setbookmarksorder`
    *   `DELETE /links`
*   `routes/storage/storage.ts`:
    *   `GET /storage/backgrounds`
    *   `GET /storage/backgroundurl`
    *   `GET /storage/icons`
    *   `GET /storage/backup`
    *   `POST /storage/backup`
    *   `POST /storage/restorebackup` (uses `multer` for file upload)
    *   `POST /storage/image` (uses `multer` for file upload)
    *   `POST /storage/icon` (uses `multer` for file upload)
    *   `POST /storage/profilepic` (uses `multer` for file upload)
    *   `DELETE /storage/image`
    *   `DELETE /storage/icon`

## 8. Utilities (`utils/`)

*   `dummyData.json`: A JSON file containing sample data for categories and links, used for populating the database with initial content. This file will need to be updated to reflect the new category structure.
*   `linksUtils.ts`:
    *   `getLinkNameByUrlLocal({ url })`: Fetches a URL and extracts the page title using `cheerio`.
    *   `getLinkStatusLocal({ url })`: Checks the HTTP status of a URL using `axios`.

## 9. Validation (`validation/`)

Zod schemas are used for request body validation.

*   `categoriesZodSchema.ts`: This new file will replace `columnsZodSchema.ts` and `desktopsZodSchema.ts`.
    *   `categoryZodSchema`: Zod schema for category data, including `parentCategory` (optional).
    *   `validateCategory(data)`: Validates full category data.
    *   `validatePartialCategory(data)`: Validates partial category data.
*   `linksZodSchema.ts`:
    *   `linkZodSchema`: Zod schema for link data, updated to use `categoryId` instead of `escritorio` and `panel`/`idpanel`.
    *   `validateLink(link)`: Validates full link data.
    *   `validatePartialLink(link)`: Validates partial link data.

## How to Run the Application

1.  **Clone the repository.**
2.  **Install dependencies:**
    ```bash
    npm install
    ```
3.  **Create a `.env` file** in the root directory and populate it with the necessary environment variables (as described in Section 1.2).
4.  **Start the server:**
    ```bash
    npm run production
    ```
    For development with auto-restarts:
    ```bash
    npm run dev
    ```