async function loadComponent(id, file) {
    const element = document.getElementById(id);

    const response = await fetch(file);
    const html = await response.text();

    element.innerHTML = html;
}

loadComponent("header", "components/header.html");
loadComponent("footer", "components/footer.html");