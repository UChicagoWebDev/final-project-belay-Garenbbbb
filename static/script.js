// Constants for main sections of the application
const SPLASH = document.querySelector(".splash.main");
const PROFILE = document.querySelector(".profile.main");
const LOGIN = document.querySelector(".login.main");
const CHAN = document.querySelector(".conversations.main");

// Function to handle routing based on current URL path
function router() {
  let path = window.location.pathname;
  let isvalid = localStorage.getItem('isvalid');
  updateUsername();
  // Show appropriate UI elements based on authentication status
  if (isvalid){
    // If user is authenticated
    document.querySelector(".signup").classList.add("hide");
    document.querySelector(".loggedOut").classList.add("hide");
    document.querySelector(".loggedIn").classList.remove("hide");
    document.querySelector(".createRoomButton").classList.remove("hide");
  }
  else{
    // If user is not authenticated
    document.querySelector(".createRoomButton").classList.add("hide");
    document.querySelector(".loggedIn").classList.add("hide");
    document.querySelector(".loggedOut").classList.remove("hide");
    document.querySelector(".signup").classList.remove("hide");
  }
   // Route to appropriate page based on URL path
  if(path === '/'){
    navigateTo(SPLASH);
  }
  else if(path === '/login'){
    if(isvalid === 'true'){
      navigateTo(SPLASH); // Navigate to splash page if already logged in
    }
    else{
      navigateTo(LOGIN); // Navigate to login page
    }
  }
  else if(path === '/profile'){
    if(isvalid === 'true'){
      navigateTo(PROFILE); // Navigate to profile page if authenticated
    }
    else{
      sessionStorage.setItem('redirect','/profile');
      navigateTo(LOGIN); // Redirect to login page if not authenticated
    }
  }
  else if(path.startsWith('/channel')){
    if(isvalid === 'true'){
      navigateTo(CHAN); // Navigate to channel page if authenticated
    }
    else{
      sessionStorage.setItem('redirect',path);
      navigateTo(LOGIN); // Redirect to login page if not authenticated
    }
  }
  loadRooms();
}

// Event listeners for password fields to check if passwords match
const passwordF = document.querySelector(".profile.main input[name=password]");
const repeatPasswordF = document.querySelector(".profile.main input[name=repeatPassword]");

// Function to check if passwords match
const checkMatches = () => {
  return document.querySelector(".profile.main input[name=password]").value == repeatPasswordF.value;
};

// Function to set custom validity message for repeat password field
const checkPasswordRepeat = () => {
  return checkMatches() ? repeatPasswordF.setCustomValidity('') : repeatPasswordF.setCustomValidity('Passwords must match');
}
passwordF.addEventListener("input", checkPasswordRepeat);
repeatPasswordF.addEventListener("input", checkPasswordRepeat);

// Function to handle user signup
function signup(){
  fetch('/api/signup',{
    method: 'GET',
    headers: {
      'Content-Type': 'application/json'
    }
  })
  .then(response => response.json())
  .then(data => {
    if (data) {
      localStorage.setItem('userId',data.user_id);
      localStorage.setItem('username',data.username);
      localStorage.setItem('isvalid','true');
      router();
    }
  })
  .catch(error => console.error('Error:', error));
}

// Function to update displayed username
function updateUsername(){
  username = localStorage.getItem('username');
  if (username){
    document.querySelectorAll('.username').forEach(element=>{
      element.textContent = username;
    });
  }
}
// Function to update user information
function update() {
  let newusername = document.querySelector('.profile.main input[name=username]').value;
  let newpassword = document.querySelector('.profile.main input[name=password]').value;
  fetch('/api/update_userinfo', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'APIKey': localStorage.getItem('api_key'),
      'UserID': localStorage.getItem('userId')
    },
    body: JSON.stringify({username: newusername, password: newpassword})
  })
  .then(response => {
    if (response.ok){ 
      localStorage.setItem('username',newusername);
      updateUsername();
    } 
    return response.json()})
  .then(data => {
    alert(data.message); 
  })
  .catch(error => console.error('Error:', error));
}

// Function to log out user
function logout(){
  sessionStorage.clear();
  localStorage.clear();
  history.pushState(null, 'Splash', '/');
  router();
}

// Function to handle user login
function login() {
  let form= document.querySelector('.alignedForm.login');
  let username = form.querySelector('input[name=username]').value;
  let password = form.querySelector('input[name=password]').value;
  if (username === '' || password === '') {
    document.querySelector('#loginfailmessage').classList.remove('hide');
    return;
  }
  fetch('/api/login',{
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({username: username, password: password})
  })
  .then(response => {
    if (response.status === 200) {
      return response.json(); 
    } else {
      return;
    }}
  )
  .then(data=> {
    if (data) {
      localStorage.setItem('username',data.username);
      localStorage.setItem('userId', data.user_id)
      localStorage.setItem('isvalid','true');
      localStorage.setItem('api_key',data.api_key);
      let redirect = sessionStorage.getItem('redirect');
      sessionStorage.removeItem('redirect');
      if (redirect){
        switch (redirect){
          case '/profile':
            navigateTo(PROFILE);
            break;
          case '/channel':
            navigateTo(CHAN);
            break;
          default:
            break;
      }}
      else{
        history.pushState(null, 'Splash', '/');
        router();
      };
    }
    else{
      document.querySelector('#loginfailmessage').classList.remove('hide');
    }
  })
  .catch(error => console.error('Error:', error));
}

// Function to create a new room
function createRoom() {
  fetch('/api/newroom', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    }
  })
  router();
}

// Function to load channels
function loadRooms(){
  fetch('/api/rooms',{
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    }
  })
  .then(response => response.json())
  .then(data => {
    channelsData = data;
    if (data.length > 0) {
    let clist = document.querySelector('.channelList');
    clist.innerHTML = '';
    data.forEach(room => {
      let Channeldiv = document.createElement('div');
      Channeldiv.classList.add('channel');
      Channeldiv.innerHTML = `<strong>[${room.id}] ${room.name}</strong>`;
      Channeldiv.addEventListener('click',()=>{
        sessionStorage.setItem('roomID',room.id);
        sessionStorage.setItem('roomName',room.name);
        history.pushState({page : `/channel/${room.id}`}, "channel", `/channel/${room.id}`);
        router();
      });
      clist.appendChild(Channeldiv);
      let hr = document.createElement('hr');
      clist.appendChild(hr);
    });}
  })
  .catch(error => console.error('Error:', error));
}
// Function to get posts for a room
function getPosts(){
  let rID = sessionStorage.getItem('roomID');
  fetch(`/api/room_posts?room_id=${rID}`,{
    method: 'GET',
    headers: {
      'Content-Type': 'application/json'
    }
  })
  .then(response => {
    if (response.status == 200) {
      return response.json();
    } else {
      throw new Error('Error:', response.status);
    }
  })
  .then(data => {
    let messageList = document.querySelector('.postList');
    messageList.innerHTML = '';
    data.forEach(message => {
      let messagediv = document.createElement('message');
      let author = document.createElement('author');
      let content = document.createElement('content');
      author.textContent = message.user_id;
      content.textContent = message.body;
      messagediv.appendChild(author);
      messagediv.appendChild(content);
      messageList.appendChild(messagediv);
    });
  })
  .catch(error => console.error('Error:', error));
}

// Function to navigate
function navigateTo(currpage) {
  SPLASH.classList.add("hide");
  PROFILE.classList.add("hide");
  LOGIN.classList.add("hide");
  CHAN.classList.add("hide");
  currpage.classList.remove("hide");
  switch (currpage) {
    case SPLASH:
      history.pushState({page : "/"}, "Splash", "/");
      break;
    case PROFILE:
      history.pushState({page : "/profile"}, "Profile", "/profile");
      break;
    case LOGIN:
      history.pushState({page : "/login"}, "Login", "/login");
      break;
    case CHAN:
      let rID = sessionStorage.getItem('roomID');
      history.pushState({page : `/channel/${rID}`}, "channel", `/channel/${rID}`);
      getPosts();
      document.getElementById('conversationName').textContent = sessionStorage.getItem('roomName');
    default:
      break;
  }
}

// Function to create posts
function createPost(){
  let rID = sessionStorage.getItem('roomID');
  let newPost = document.querySelector('.conversations.main textarea[name=post]').value;
  if (newPost == "") {
    return;
  }
  fetch(`/api/room/${rID}/post`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'UserID': localStorage.getItem('username')
    },
    body: JSON.stringify({message: newPost})
  })
  .then(response => {
    if (response.status === 200) {
      return response.json(); 
    } else {
      throw new Error('Error:', response.status);
    }
  })
  .then(data => {
    getPosts();
  })
  .catch(error => console.error('Error:', error));
}

// Function to show editing options for room name
function showeditName(){
  document.querySelector('.editChannelName').classList.remove('hide');
  document.getElementById('conversationName').classList.add('hide');
  document.querySelector('.clicktoedit').classList.add('hide');
}

// Function to delete a room
function deleteRoom() {
  let rID = sessionStorage.getItem('roomID');
  fetch('/api/delete_room', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({roomId: rID})
  })
  .then(response => {
    if (response.ok){ 
      location.reload()
    } 
    return response.json()})
  .then(data => {
    alert(data.message); 
  })
  .catch(error => console.error('Error:', error));

}

window.onpopstate = (event) =>{
  if(event.state){
    router();
  }
}

// Function to edit room name
function editRoomName() {
  let rID = sessionStorage.getItem('roomID');
  let newName = document.getElementById('channelNameInput').value;
  fetch('/api/update_room_name', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({roomName: newName, roomId: rID})
  })
  .then(response => {
    if (response.ok){ 
      router();
      document.querySelector('.editChannelName').classList.add('hide');
      document.getElementById('conversationName').classList.remove('hide');
      document.getElementById('conversationName').textContent = newName;
      document.querySelector('.clicktoedit').classList.remove('hide');
    } 
    return response.json()})
  .then(data => {
    alert(data.message); 
  })
  .catch(error => console.error('Error:', error));

}



document.addEventListener('DOMContentLoaded',()=>{
  history.pushState(null, 'Splash', '/');
  router();
  });