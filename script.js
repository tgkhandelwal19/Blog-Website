// ================== GLOBAL ==================
let page = 1;
let loading = false;
let noMoreBlogs = false;

// ================== ON LOAD ==================
document.addEventListener("DOMContentLoaded", () => {

  const token = localStorage.getItem("token");

  // ===== HIDE WRITE BUTTON IF NOT LOGGED IN =====
  document.querySelectorAll(".write-btn").forEach(btn => {
    if (!token) btn.style.display = "none";
  });

  // ===== SIDEBAR TOGGLE =====
  const menuBtn = document.getElementById("menuBtn");
  const sidebar = document.querySelector(".sidebar");
  const layout = document.querySelector(".layout");

  if (menuBtn && sidebar && layout) {
    menuBtn.onclick = () => {
      sidebar.classList.toggle("hide");
      layout.classList.toggle("full");
    };
  }

  // ===== ACTIVE LINK =====
  document.querySelectorAll(".sidebar a").forEach(link => {
    if (window.location.pathname.includes(link.getAttribute("href"))) {
      link.classList.add("active");
    }
  });

  // ===== LOAD BLOGS (HOME) =====
  if (document.getElementById("blogs")) {
    loadBlogs();
  }

  // ===== LOAD LIBRARY =====
  if (document.getElementById("myBlogs")) {
    loadMyBlogs();
  }

});


// ================== OPEN BLOG ==================
function openBlog(id) {
  window.location.href = `blog.html?id=${id}`;
}


// ================== LOAD BLOGS (HOME) ==================
function loadBlogs() {
  if (loading || noMoreBlogs) return;

  loading = true;

  fetch(`http://localhost:5000/api/blogs?page=${page}`)
    .then(res => res.json())
    .then(data => {

      if (!data.length) {
        noMoreBlogs = true;
        return;
      }

      const container = document.getElementById("blogs");

      data.forEach(blog => {
        const div = document.createElement("div");
        div.className = "blog";

        div.innerHTML = `
          <div class="blog-card" onclick="openBlog('${blog._id}')">

            <div class="blog-left">
              <div class="author">
                <div class="author-avatar">
                  ${blog.author.username.charAt(0)}
                </div>
                <span>${blog.author.username}</span>
              </div>

              <h2 class="blog-title">${blog.title}</h2>

              <p class="blog-desc">
                ${blog.content.substring(0, 140)}...
              </p>

              <div class="blog-footer">
                <span>${new Date(blog.createdAt).toDateString()}</span>
                <span>👏 ${blog.likes}</span>
              </div>
            </div>

            <div class="blog-right">
              <img src="${blog.image || 'https://picsum.photos/200/130'}" />
            </div>

          </div>
        `;

        container.appendChild(div);
      });

      loading = false;
    })
    .catch(err => {
      console.log(err);
      loading = false;
    });
}


// ================== LOAD MY BLOGS (LIBRARY) ==================
function loadMyBlogs() {
  const token = localStorage.getItem("token");

  if (!token) {
    alert("Login first");
    return window.location.href = "login.html";
  }

  fetch("http://localhost:5000/api/myblogs", {
    headers: { Authorization: token }
  })
    .then(res => res.json())
    .then(data => {

      const container = document.getElementById("myBlogs");
      container.innerHTML = "";

      if (!data.length) {
        container.innerHTML = "<p>No blogs yet</p>";
        return;
      }

      data.forEach(blog => {
        const div = document.createElement("div");
        div.className = "blog";

        div.innerHTML = `
          <div class="blog-card">

            <div class="blog-left">
              <h2 class="blog-title">${blog.title}</h2>

              <p class="blog-desc">
                ${blog.content.substring(0, 140)}...
              </p>

              <div class="blog-footer">
                <span>${new Date(blog.createdAt).toDateString()}</span>
                <span>👏 ${blog.likes}</span>
              </div>

              <div class="actions">
                <button onclick="openBlog('${blog._id}')">Read</button>
                <button onclick="editBlog('${blog._id}')">Edit</button>
                <button onclick="deleteBlog('${blog._id}')">Delete</button>
              </div>
            </div>

            <div class="blog-right">
              <img src="${blog.image || 'https://picsum.photos/200/130'}" />
            </div>

          </div>
        `;

        container.appendChild(div);
      });
    });
}


// ================== INFINITE SCROLL ==================
window.addEventListener("scroll", () => {
  if (
    window.innerHeight + window.scrollY >= document.body.offsetHeight - 100
  ) {
    page++;
    loadBlogs();
  }
});


// ================== CREATE BLOG ==================
const form = document.getElementById("blogForm");

if (form) {
  form.onsubmit = async (e) => {
    e.preventDefault();

    const token = localStorage.getItem("token");

    if (!token) {
      alert("Login first");
      return window.location.href = "login.html";
    }

    const title = document.getElementById("title").value;
    const content = document.getElementById("content").value;
    const file = document.getElementById("imageInput").files[0];

    let imageBase64 = "";

    if (file) {
      const reader = new FileReader();

      reader.onload = async () => {
        imageBase64 = reader.result;
        await sendBlog(title, content, imageBase64, token);
      };

      reader.readAsDataURL(file);
    } else {
      await sendBlog(title, content, "", token);
    }
  };
}

async function sendBlog(title, content, image, token) {
  await fetch("http://localhost:5000/api/blogs", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": token
    },
    body: JSON.stringify({ title, content, image })
  });

  window.location.href = "index.html";
}


// ================== DELETE ==================
function deleteBlog(id) {
  const token = localStorage.getItem("token");

  if (!confirm("Delete this blog?")) return;

  fetch(`http://localhost:5000/api/blogs/${id}`, {
    method: "DELETE",
    headers: { Authorization: token }
  }).then(() => location.reload());
}


// ================== EDIT ==================
function editBlog(id) {
  window.location.href = `edit.html?id=${id}`;
}


// ================== LIKE ==================
function likeBlog(id) {
  fetch(`http://localhost:5000/api/like/${id}`, {
    method: "POST",
    headers: { Authorization: localStorage.getItem("token") }
  }).then(() => location.reload());
}


// ================== BOOKMARK ==================
function bookmarkBlog(id) {
  fetch(`http://localhost:5000/api/bookmark/${id}`, {
    method: "POST",
    headers: { Authorization: localStorage.getItem("token") }
  }).then(() => alert("Saved ⭐"));
}


// ================== LOGIN ==================
const loginForm = document.getElementById("loginForm");

if (loginForm) {
  loginForm.onsubmit = async (e) => {
    e.preventDefault();

    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;

    const res = await fetch("http://localhost:5000/api/login", {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({ email, password })
    });

    const data = await res.json();

    if (data.token) {
      localStorage.setItem("token", data.token);
      window.location.href = "index.html";
    } else {
      alert(data.msg);
    }
  };
}


// ================== LOGOUT ==================
function logout() {
  localStorage.removeItem("token");
  window.location.href = "login.html";
}