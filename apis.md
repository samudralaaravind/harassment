# API Documentation - Harassment & Injustice Reporting App

This document describes the authentication and core APIs for the Harassment & Injustice Reporting system.  
Both **citizens** and **admins** have different authorization scopes.

---

## Authentication & Authorization

- **Citizens** authenticate using mobile number + OTP.
- **Admins** authenticate using email + password.
- All subsequent requests require a **JWT token** in the `Authorization` header.

```http
Authorization: Bearer <JWT_TOKEN>
```

---

## Status Codes

| Status Code                   | Description                                     |
| ----------------------------- | ----------------------------------------------- |
| **200 OK**                    | Request was successful.                         |
| **201 Created**               | Resource successfully created.                  |
| **400 Bad Request**           | Invalid input or missing required fields.       |
| **401 Unauthorized**          | Authentication failed or token missing/expired. |
| **403 Forbidden**             | User does not have access to the resource.      |
| **404 Not Found**             | Requested resource not found.                   |
| **500 Internal Server Error** | Something went wrong on the server.             |

---

## Auth APIs

### 1. Send OTP (Citizen Login)

**POST** `/auth/otp/send`

- Sends an OTP to the citizen’s mobile number.

**Request**

```json
{
  "mobileNumber": "9876543210"
}
```

**Responses**

- **200 OK**

```json
{ "message": "OTP sent successfully" }
```

- **400 Bad Request**

```json
{ "message": "Invalid mobile number" }
```

---

### 2. Verify OTP (Acts as login API for both citizens and admins)

**POST** `/auth/otp/verify`

- Verifies OTP and generates JWT token.

**Request**

```json
{
  "mobileNumber": "9876543210",
  "otp": "123456"
}
```

**Responses**

- **200 OK**

```json
{
  "headers": {
    "Set-Cookie": "JWT_TOKEN"
  },
  "message": "Logged in successfully"
}
```

- **400 Bad Request**
  When the requested OTP doesn't match with the actual OTP that was sent earlier.

```json
{
  "message": "Invalid OTP"
}
```

- **410 Gone**
  When the OTP is expired.

```json
{ "message": "OTP expired, please send another one." }
```

- **404 Not Found**
  When the user / OTP is not found in database.

```json
{ "message": "User/OTP not found" }
```

---

### 4. iam - Get User Info

**GET** `/iam`

- Returns basic user info and enabled routes based on role.

**Headers**

```http
Authorization: Bearer JWT_TOKEN
```

**Response**

```json
{
  "userInfo": {
    "fullName": "Aravind",
    "location": {
      "state": "Telangana",
      "district": "Hyderabad",
      "mandal": "Madhapur",
      "village": "Madhapur"
    }
  },
  "enabledRoutes": [
    {
      "path": "/complaints/self",
      "title": "My Complaints"
    },
    {
      "path": "/complaints/all",
      "title": "All Complaints"
    }
  ],
  "maxComplaintsExceeded": false
}
```

---

## Location APIs

### 5. Search Location

**POST** `/location/search`

- Provides auto-suggest for states, districts, mandals, villages.

**Request**

```json
{
  "search": {
    "query": "Hyde",
    "state": false,
    "district": true,
    "mandal": false,
    "village": false
  }
}
```

**Responses**

- **200 OK**

```json
{
  "results": [
    {
      "id": "district123",
      "value": "Hyderabad"
    }
  ]
}
```

- **400 Bad Request**

```json
{ "message": "Invalid search query" }
```

---

## Complaint APIs

### 6. Get Complaints

**POST** `/complaints`

- **Citizen:** Fetches complaints of logged-in user.
- **Admin:** Fetches complaints based on filters.

**Request**

```json
{
  "filters": {
    "selectedPriority": "P0",
    "location": {
      "stateId": "TS",
      "districtId": "HYD",
      "mandalId": null,
      "villageId": null
    }
  },
  "paginationInfo": {
    "pageNumber": 1,
    "pageSize": 2
  }
}
```

**Response**

- **200 OK**

```json
{
  "complaints": [
    {
      "complaintId": "CMP123",
      "fullname": "Sita R",
      "location": "Hyderabad, Miyapur",
      "priority": "High",
      "status": "Pending",
      "lastUpdated": "3 days ago",
      "assets": [],
      "permissions": { "canUpdateStatus": false }
    }
  ],
  "pagination": {
    "totalPages": 3,
    "currentPage": 1,
    "pageSize": 2
  }
}
```

- **401 Unauthorized**

```json
{ "message": "Invalid or expired token" }
```

- **403 Forbidden**

```json
{ "message": "Access denied" }
```

---

### 7. Create Complaint (Citizen)

**POST** `/complaints/create`

- Allows a **citizen** to file a new complaint.
- Backend validates location, priority, and attachments.
- Citizens may be restricted to a maximum number of complaints per 30 days.

**Headers**

```http
Authorization: Bearer JWT_TOKEN
Content-Type: application/json
```

**Request**

```json
{
  "title": "Harassment at workplace",
  "description": "Detailed description of the incident...",
  "priority": "P0",
  "location": {
    "stateId": "TS",
    "districtId": "HYD",
    "mandalId": "MYP",
    "villageId": null
  },
  "assets": ["https://cdn.example.com/uploads/proof1.jpg"]
}
```

**Responses**

- **201 Created**

```json
{
  "complaintId": "CMP456",
  "message": "Complaint created successfully"
}
```

- **400 Bad Request**

```json
{ "message": "Missing required fields" }
```

- **401 Unauthorized**

```json
{ "message": "Invalid or expired token" }
```

---

### 8. Update Complaint Status (Admin)

**PUT** `/complaints/{complaintId}/status`

- Allows an **admin** to update the status of an existing complaint.
- Citizens **cannot** access this API.

**Headers**

```http
Authorization: Bearer JWT_TOKEN
Content-Type: application/json
```

**Request**

```json
{
  "from": "", // We need to pass from status too, to avoid any concurrent mutations by other admin users.
  "to": "RESOLVED" // to status
}
```

**Responses**

- **200 OK**

```json
{
  "complaintId": "CMP456",
  "updatedStatus": "Resolved",
  "message": "Complaint status updated successfully"
}
```

- **400 Bad Request**

```json
{ "message": "Invalid status value" }
```

- **401 Unauthorized**

```json
{ "message": "Invalid or expired token" }
```

- **403 Forbidden**

```json
{ "message": "Only admins can update complaint status" }
```

- **404 Not Found**

```json
{ "message": "Complaint not found" }
```

### 9. Image Upload API

**POST** `/upload`

Upload an image related to a complaint. The image will be uploaded to a third-party storage service (e.g., Cloudinary).  
This API supports **upload progress tracking** on the client side. Only citizens can upload call this API.

**Request**

- **Headers**
- Content-Type: multipart/form-data
- Authorization: Bearer Token
- Body: Binary

**Response**

```json
{
  "image_url": "" // CDN link of uploaded image
}
```
