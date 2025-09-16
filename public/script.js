document.getElementById("tweetForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const form = e.target;
  const formData = new FormData(form);

  const response = await fetch("/upload", {
    method: "POST",
    body: formData
  });

  const result = await response.json();
  document.getElementById("response").textContent = result.message || result.error;
});

// Preview gambar
document.querySelector('input[name="image"]').addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = () => {
      document.getElementById("preview").innerHTML = `<img src="${reader.result}" alt="Preview">`;
    };
    reader.readAsDataURL(file);
  }
});
