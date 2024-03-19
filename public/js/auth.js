document.getElementById('signup-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.target;
    const formData = new FormData(form);
    try {
        const response = await axios.post('/signup', formData, {
            headers: {
                'Content-Type': 'multipart/form-data'
            }
        });
        console.log(response.data);
        // Redirect user to chat page or display success message
    } catch (error) {
        console.error(error);
        // Display error message
    }
});
