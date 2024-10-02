document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('vaccination-form');
  const tableBody = document.querySelector('#vaccination-table tbody');
  const searchInput = document.getElementById('search');
  const sendRemindersButton = document.getElementById('send-reminders-button');

  async function loadVaccinations() {
    try {
      const data = await window.electronAPI.readData();
      tableBody.innerHTML = ''; // Clear existing rows
      data.forEach(vaccination => {
        const row = document.createElement('tr');
        row.innerHTML = `
          <td>${vaccination.petName}</td>
          <td>${vaccination.ownerName}</td>
          <td>${vaccination.ownerContact}</td>
          <td>${vaccination.vaccinationDate}</td>
          <td>${vaccination.expiryDate}</td>
          <td>${vaccination.vaccinationType}</td>
          <td><button class="delete-button">Delete</button></td>
        `;
        tableBody.appendChild(row);
      });
    } catch (error) {
      console.error('Error loading vaccinations:', error);
    }
  }

  loadVaccinations();

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const petName = document.getElementById('pet-name').value;
    const ownerName = document.getElementById('owner-name').value;
    const ownerContact = document.getElementById('owner-contact').value;
    const vaccinationDate = document.getElementById('vaccination-date').value;
    const expiryDate = document.getElementById('expiry-date').value;
    const vaccinationType = document.getElementById('vaccination-type').value;

    try {
      let data = await window.electronAPI.readData();
      data.push({
        petName,
        ownerName,
        ownerContact,
        vaccinationDate,
        expiryDate,
        vaccinationType,
        reminderSent: false // Add this field to track if reminder is sent
      });
      await window.electronAPI.writeData(data);

      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${petName}</td>
        <td>${ownerName}</td>
        <td>${ownerContact}</td>
        <td>${vaccinationDate}</td>
        <td>${expiryDate}</td>
        <td>${vaccinationType}</td>
        <td><button class="delete-button">Delete</button></td>
      `;
      tableBody.appendChild(row);
      form.reset();
    } catch (error) {
      console.error('Error adding vaccination:', error);
    }
  });

  tableBody.addEventListener('click', async (e) => {
    if (e.target.classList.contains('delete-button')) {
      const row = e.target.parentElement.parentElement;
      const petName = row.children[0].textContent;
      const ownerContact = row.children[2].textContent;

      try {
        let data = await window.electronAPI.readData();
        data = data.filter(item => !(item.petName === petName && item.ownerContact === ownerContact));
        await window.electronAPI.writeData(data);

        row.remove();
      } catch (error) {
        console.error('Error deleting vaccination:', error);
      }
    }
  });

  searchInput.addEventListener('input', () => {
    const searchTerm = searchInput.value.toLowerCase();
    const rows = tableBody.querySelectorAll('tr');

    rows.forEach(row => {
      const petName = row.children[0].textContent.toLowerCase();
      const ownerContact = row.children[2].textContent.toLowerCase();

      if (petName.includes(searchTerm) || ownerContact.includes(searchTerm)) {
        row.style.display = '';
      } else {
        row.style.display = 'none';
      }
    });
  });

  sendRemindersButton.addEventListener('click', async () => {
    try {
      await window.electronAPI.sendReminders();
      alert('Reminders sent!');
    } catch (error) {
      console.error('Failed to send reminders:', error);
      alert('Failed to send reminders.');
    }
  });
});
