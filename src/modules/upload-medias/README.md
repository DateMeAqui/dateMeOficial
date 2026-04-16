# Upload Medias Module

This module provides file upload functionality for both REST API and GraphQL endpoints.

## Features

- **Single File Upload**: Upload individual files via REST API or GraphQL
- **Multiple File Upload**: Upload multiple files at once via REST API
- **File Type Validation**: Supports images (JPEG, PNG, GIF, WebP) and videos (MP4, AVI, MOV, MKV)
- **File Size Limits**: Maximum 50MB per file
- **Automatic Directory Creation**: Creates upload directory if it doesn't exist
- **Unique File Names**: Uses UUID to prevent filename conflicts

## API Endpoints

### REST API

#### Single File Upload
```
POST /upload-medias/single
Content-Type: multipart/form-data

Body:
- file: File (required)
- isVideo: boolean (optional, default: false)
```

#### Multiple Files Upload
```
POST /upload-medias/multiple
Content-Type: multipart/form-data

Body:
- files: File[] (required)
- isVideo: boolean (optional, default: false)
```

### GraphQL

#### Single File Upload
```graphql
mutation UploadFile($file: Upload!, $isVideo: Boolean) {
  uploadFile(file: $file, isVideo: $isVideo)
}
```

## Response Format

### Success Response
```json
{
  "success": true,
  "message": "File uploaded successfully",
  "fileUrl": "/uploads/uuid-filename.ext"
}
```

### Multiple Files Response
```json
{
  "success": true,
  "message": "Files uploaded successfully",
  "fileUrls": [
    "/uploads/uuid-filename1.ext",
    "/uploads/uuid-filename2.ext"
  ]
}
```

## Configuration

The module uses Multer for file handling with the following configuration:

- **Storage**: Disk storage in `./uploads` directory
- **File Filter**: Validates MIME types
- **Size Limit**: 50MB per file
- **Filename**: UUID-based unique names

## File Types Supported

### Images
- JPEG (`image/jpeg`)
- PNG (`image/png`)
- GIF (`image/gif`)
- WebP (`image/webp`)

### Videos
- MP4 (`video/mp4`)
- AVI (`video/avi`)
- MOV (`video/mov`)
- MKV (`video/mkv`)

## Error Handling

- **400 Bad Request**: Invalid file type, missing file, or file too large
- **500 Internal Server Error**: File system errors or directory creation failures

## Usage Examples

### REST API with curl
```bash
# Single file upload
curl -X POST http://localhost:3000/upload-medias/single \
  -F "file=@image.jpg" \
  -F "isVideo=false"

# Multiple files upload
curl -X POST http://localhost:3000/upload-medias/multiple \
  -F "files=@image1.jpg" \
  -F "files=@image2.png" \
  -F "isVideo=false"
```

### GraphQL with Apollo Client
```javascript
const UPLOAD_FILE = gql`
  mutation UploadFile($file: Upload!, $isVideo: Boolean) {
    uploadFile(file: $file, isVideo: $isVideo)
  }
`;

// Usage
const [uploadFile] = useMutation(UPLOAD_FILE);
const result = await uploadFile({
  variables: {
    file: fileInput.files[0],
    isVideo: false
  }
});
```

## Static File Serving

Files are served statically at `/uploads/` path as configured in `main.ts`:

```typescript
app.useStaticAssets(join(__dirname, '..', 'uploads'), { prefix: '/uploads/' });
```

This means uploaded files are accessible at `http://localhost:3000/uploads/filename.ext`.

