# Bible Reader PWA

## Overview
Bible Reader is a Progressive Web App (PWA) designed to help users track the chapters they have read in the Bible. The app provides a user-friendly interface to mark chapters as read, view overall progress, and manage reading lists.

## Features
- Track chapters read across multiple books of the Bible.
- Visual progress indicators including a donut chart and progress bar.
- Options to mark all chapters as read or clear the current book.
- Import and export reading progress in JSON format.
- Responsive design for use on various devices.

## Project Structure
```
bible-reader
├── index.html          # Main HTML document
├── manifest.webmanifest # Metadata for PWA
├── service-worker.js   # Service worker for offline functionality
├── script.js           # JavaScript logic for the app
├── style.css           # Styles for the app
├── icons               # Directory for app icons
│   └── .gitkeep        # Placeholder for version control
├── data                # Directory for data files
│   ├── reading-plan-canonical.json      # 365-day canonical reading plan (Genesis → Revelation)
│   └── reading-plan-chronological.json  # 365-day commercial chronological reading plan
├── package.json        # npm configuration file
└── README.md           # Project documentation
```

## Setup Instructions
1. Clone the repository:
   ```
   git clone <repository-url>
   cd bible-reader
   ```

2. Install dependencies (if any):
   ```
   npm install
   ```

3. Open `index.html` in a web browser to run the app.

## Usage
- Use the sidebar to navigate through different books of the Bible.
- Click on chapters to mark them as read.
- Use the controls to mark all chapters as read, clear the current book, or import/export your reading progress.

## PWA Features
- The app can be installed on devices for offline access.
- Service worker caches resources for offline functionality.
- Manifest file provides metadata for installation and display.

## Contributing
Contributions are welcome! Please submit a pull request or open an issue for any suggestions or improvements.

## License
This project is licensed under the MIT License.