import string
import random
from datetime import datetime
import sqlite3
from flask import Flask, g, jsonify, request
from functools import wraps

app = Flask(__name__)
app.config['SEND_FILE_MAX_AGE_DEFAULT'] = 0

def get_db():
    db = getattr(g, '_database', None)

    if db is None:
        db = g._database = sqlite3.connect('db/watchparty.sqlite3')
        db.row_factory = sqlite3.Row
        setattr(g, '_database', db)
    return db

@app.teardown_appcontext
def close_connection(exception):
    db = getattr(g, '_database', None)
    if db is not None:
        db.close()

def query_db(query, args=(), one=False):
    db = get_db()
    cursor = db.execute(query, args)
    rows = cursor.fetchall()
    db.commit()
    cursor.close()
    if rows:
        if one: 
            return rows[0]
        return rows
    return None

def new_user():
    name = "Unnamed User #" + ''.join(random.choices(string.digits, k=6))
    password = ''.join(random.choices(string.ascii_lowercase + string.digits, k=10))
    api_key = ''.join(random.choices(string.ascii_lowercase + string.digits, k=40))
    u = query_db('insert into users (name, password, api_key) ' + 
        'values (?, ?, ?) returning id, name, password, api_key',
        (name, password, api_key),
        one=True)
    return u

# -------------------------------- API ROUTES ----------------------------------
@app.route('/')
@app.route('/profile')
@app.route('/login')
@app.route('/channel')
@app.route('/channel/<ch_id>')
def index(ch_id=None):
    return app.send_static_file('index.html')

@app.errorhandler(404)
def page_not_found(e):
    return app.send_static_file('404.html'), 404

@app.route('/api/signup', methods=['GET'])
def signup():
    new_usr = new_user()
    print(new_usr)
    if new_usr:
        return jsonify({
            "password": new_usr["password"],
            "username": new_usr["name"],
            "user_id": new_usr["id"],
            "api_key": new_usr["api_key"]
        }), 200
    else:
        return jsonify({"error": "Failed User Creation"}), 500

@app.route('/api/update_userinfo', methods=['PUT'])
def update_userInfo():
    new_username = request.get_json().get('username')
    new_password = request.get_json().get('password')
    userId = request.headers.get('UserID')
    try:
        if new_username:
            query = "UPDATE users SET name = ? WHERE id = ?"
            parameters = (new_username, userId)
            conn = get_db() 
            cursor = conn.cursor()
            cursor.execute(query, parameters)
            conn.commit()
            conn.close()
        if new_password:
            query = "UPDATE users SET password = ? WHERE id = ?"
            parameters = (new_password, userId)
            conn = get_db() 
            cursor = conn.cursor()
            cursor.execute(query, parameters)
            conn.commit()
            conn.close()
        return jsonify({'message': 'User Information Successfully Ipdated'}), 200
    except Exception as e:
        return jsonify({'error': 'Update Fails', 'details': str(e)}), 500

@app.route('/api/login', methods=['POST'])
def login():
    username = request.get_json().get('username')
    password = request.get_json().get('password')
    try:
        if username and password:
            user = query_db('SELECT * FROM users WHERE name = ? AND password = ?', (username, password), one=True)
            if user:
                return jsonify({
                    'user_id': user['id'], 
                    'username': user['name'],
                    "user_id": user["id"], 
                    'api_key': user['api_key']}), 200
    except Exception as e:
        return jsonify({'error': 'Login Failed', 'details': str(e)}), 500

@app.route('/api/newroom', methods=['POST'])
def create_room():
    try:
        room = query_db('insert into rooms (name) values (?) returning id, name', [ "Channel #" + ''.join(random.choices(string.ascii_letters, k=6))], one=True)            
        if room:
            return jsonify({
                'id': room['id'], 
                'name': room['name']
                }), 200
    except Exception as e:
        return jsonify({'error': 'Channel Craetion Failed', 'details': str(e)}), 500

@app.route('/api/delete_room', methods=['PUT'])
def delete_room():
    rId = request.get_json().get('roomId')
    try:
        if rId:
            conn = get_db() 
            cursor = conn.cursor()
            cursor.execute('DELETE FROM rooms WHERE id = ?', (rId,))
            conn.commit()
            conn.close()

        return jsonify({'message': 'Room Delete Successfully'}), 200
    except Exception as e:
        print(str(e))
        return jsonify({'error': 'Update Fails', 'details': str(e)}), 500


@app.route('/api/rooms', methods=['GET'])
def get_rooms():
    try:
        ch = query_db('select * from rooms')
        if ch:
            return jsonify([dict(i) for i in ch]), 200
        else:
            jsonify([]), 200
    except Exception as e:
        print(str(e))
        return jsonify([]), 500

@app.route('/api/room_posts', methods=['GET'])
def get_room_messages():
    try:
        rid = request.args.get('room_id')
        posts = query_db('select * from messages where room_id = ?', [rid], one=False)
        if posts:
            return jsonify([dict(p) for p in posts]), 200
        else:
            return jsonify([]), 200
    except Exception as e:
        print(str(e))
        return jsonify([]), 500

@app.route('/api/room/<rid>/post', methods=['POST'])
def create_post(rid):
    try:
        username = request.headers.get('UserID')
        msg = request.get_json().get('message')
        if msg:
            post = query_db('insert into messages (room_id, user_id, body) values (?, ?, ?) returning id, room_id, user_id, body', [rid, username, msg], one=True)
            if post:
                return jsonify(dict(post)), 200
        return jsonify({'error': 'Post Failed'}), 500
    except Exception as e:
        print(str(e))
        return jsonify([]), 500


@app.route('/api/update_room_name', methods=['PUT'])
def update_room_name():
    rname = request.get_json().get('roomName')
    rId = request.get_json().get('roomId')
    print(rname)
    print(rId)

    try:
        if rname and rId:
            query = "UPDATE rooms SET name = ? WHERE id = ?"
            parameters = (rname, rId)
            conn = get_db() 
            cursor = conn.cursor()
            cursor.execute(query, parameters)
            conn.commit()
            conn.close()

        return jsonify({'message': 'Room Information Successfully Updated'}), 200
    except Exception as e:
        return jsonify({'error': 'Update Fails', 'details': str(e)}), 500
    


    
app.run(host='0.0.0.0', port=5000, debug=True)