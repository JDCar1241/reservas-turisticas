
const reserveButtons = document.querySelectorAll(".reserve-btn");

reserveButtons.forEach((button) => {
    button.addEventListener("click", () => {
        const destination = button.dataset.destination;

        alert(
            `Has seleccionado: ${destination}.\n\n` +
            "Próximamente podrás consultar los paquetes, " +
            "la disponibilidad y registrar tu reserva."
        );
    });
});
    