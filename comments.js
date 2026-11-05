// Likes and comments for one chapter of the reader. No accounts; the name is optional.
// Markup, on a chapter page:
//   <section id="comments" data-chapter="ch00" data-api="https://malfoid-comments.<account>.workers.dev"></section>
//   <script src="../../comments.js" defer></script>
// Everything is written with textContent, so readers cannot inject HTML.
(function () {
  var root = document.getElementById("comments");
  if (!root) return;
  var chapter = root.getAttribute("data-chapter");
  var api = (root.getAttribute("data-api") || "").replace(/\/$/, "");
  if (!chapter || !api) return;

  function el(tag, attrs, text) {
    var node = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) { node.setAttribute(k, attrs[k]); });
    if (text != null) node.textContent = text;
    return node;
  }
  function request(method, path, body) {
    var opts = { method: method, headers: {} };
    if (body) {
      opts.headers["Content-Type"] = "application/json";
      opts.body = JSON.stringify(body);
    }
    return fetch(api + path, opts).then(function (res) {
      return res.json().catch(function () { return {}; }).then(function (data) {
        if (!res.ok) throw new Error(data.error || "Something went wrong.");
        return data;
      });
    });
  }
  function when(seconds) {
    var d = new Date(seconds * 1000);
    return d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
  }

  // Like button
  var likeBox = el("div", { class: "like-box" });
  var likeBtn = el("button", { type: "button", class: "like", "aria-pressed": "false" }, "♡ Like");
  var likeCount = el("span", { class: "like-count", "aria-live": "polite" }, "");
  likeBox.append(likeBtn, " ", likeCount);

  function renderLikes(data) {
    likeBtn.setAttribute("aria-pressed", data.liked ? "true" : "false");
    likeBtn.textContent = (data.liked ? "♥ Liked" : "♡ Like");
    likeCount.textContent = data.count + (data.count === 1 ? " like" : " likes");
  }
  likeBtn.addEventListener("click", function () {
    var liked = likeBtn.getAttribute("aria-pressed") === "true";
    likeBtn.disabled = true;
    request(liked ? "DELETE" : "POST", "/api/chapters/" + chapter + "/likes")
      .then(renderLikes)
      .catch(function () { likeCount.textContent = "Could not save your like. Try again."; })
      .finally(function () { likeBtn.disabled = false; });
  });

  // Comment list
  var list = el("ol", { class: "comment-list" });
  var empty = el("p", { class: "comment-empty" }, "No comments yet. Be the first.");

  function addComment(c) {
    var item = el("li", { class: "comment" });
    item.append(el("p", { class: "comment-meta" }, c.name + " · " + when(c.created_at)));
    item.append(el("p", { class: "comment-body" }, c.body));
    list.append(item);
    empty.hidden = true;
  }
  function renderComments(items) {
    list.textContent = "";
    items.forEach(addComment);
    empty.hidden = items.length > 0;
  }

  // Form
  var form = el("form", { class: "comment-form" });
  var nameIn = el("input", { type: "text", name: "name", maxlength: "40", placeholder: "Name (optional)", "aria-label": "Name, optional" });
  var bodyIn = el("textarea", { name: "body", maxlength: "1000", rows: "4", required: "required", placeholder: "Your comment", "aria-label": "Comment" });
  var honey = el("input", { type: "text", name: "website", tabindex: "-1", autocomplete: "off", style: "position:absolute;left:-9999px", "aria-hidden": "true" });
  var send = el("button", { type: "submit" }, "Post comment");
  var status = el("p", { class: "comment-status", "aria-live": "polite" }, "");
  form.append(nameIn, bodyIn, honey, send, status);

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    send.disabled = true;
    status.textContent = "Posting…";
    request("POST", "/api/chapters/" + chapter + "/comments", {
      name: nameIn.value,
      body: bodyIn.value,
      website: honey.value,
    }).then(function (data) {
      bodyIn.value = "";
      status.textContent = "Thanks. Your comment is posted.";
      if (data.comment) addComment(data.comment);
    }).catch(function (err) {
      status.textContent = err.message;
    }).finally(function () { send.disabled = false; });
  });

  root.append(el("h2", {}, "Comments"), likeBox, empty, list, el("h3", {}, "Leave a comment"), form);

  request("GET", "/api/chapters/" + chapter + "/likes").then(renderLikes).catch(function () {});
  request("GET", "/api/chapters/" + chapter + "/comments").then(function (data) {
    renderComments(data.comments || []);
  }).catch(function () {});
})();
