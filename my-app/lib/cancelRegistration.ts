export async function cancelRegistration(
    eventId: number
) {

    const token =
        localStorage.getItem("token");

    const response =
        await fetch(
            `http://localhost:8080/events/${eventId}/participants/cancel`,
            {
                method: "DELETE",

                headers: {
                    Authorization:
                        `Bearer ${token}`,
                },
            }
        );

    if (!response.ok) {

        const error =
            await response.text();

        throw new Error(
            error || "Erro ao cancelar inscrição."
        );
    }

    return response.text();
}