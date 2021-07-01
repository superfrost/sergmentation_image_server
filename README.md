### This is image processing server

Server side written on Node.js + Express + Better-Sqlite
Data base SqLite3
Image processing written on Python3.8 + Numpy + Pillow

### Installation

First install packages for node from project folder: `npm i`

Then go to folder `python_env` 
```sh
cd python_env
```

Create `venv` folder for python using: 
```sh
python -m venv venv
```

Activate python virtual environment:
    - Windows: `.\venv\Scripts\activate`
    - Linux: `source ./venv/Scripts/activate`

Install packages for python: `numpy`, `Pillow`
 ```sh
 pip install numpy Pillow
 ``` 
 or 
 ```sh
 pip install -r req.txt
 ```

Deactivate environment using command: `deactivate`

Go to project folder: `cd ..`

Start server: `npm start` or `node server.js` or use PM2 to demonize it
