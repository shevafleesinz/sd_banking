document.addEventListener('DOMContentLoaded', () => {
    let Cfg = {};
    let Loc = {};
    const loginContainer = document.getElementById('login-container');
    const bankContainer = document.getElementById('bank-container');
    const loadingOverlay = document.getElementById('loading-overlay');
    const notificationContainer = document.getElementById('notification-container');
    const pinSetupView = document.getElementById('pin-setup-view');
    const pinLoginView = document.getElementById('pin-login-view');
    const navLinks = document.querySelectorAll('.nav-link');
    const pages = document.querySelectorAll('.main-content .page');
    const closeBtn = document.getElementById('close-btn');
    const quickAmountButtons = document.querySelectorAll('.btn-amount');
    const themeToggle = document.getElementById('theme-toggle');
    
    let correctPin = null;
    let currentPlayerData = {};

    const showLoader = () => loadingOverlay.style.display = 'flex';
    const hideLoader = () => loadingOverlay.style.display = 'none';

    const post = async (eventName, data = {}) => {
        try {
            const resName = window.GetParentResourceName ? window.GetParentResourceName() : 'esx_atm';
            const response = await fetch(`https://${resName}/${eventName}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json; charset=UTF-8' },
                body: JSON.stringify(data),
            });
            return await response.json();
        } catch (e) {
            if (eventName === 'close') {
                showBankUI(false);
                showLoginUI(false);
            }
            return null;
        }
    };

    function showNotification(message, type = 'info', duration = 5000) {
        const notif = document.createElement('div');
        notif.className = `notification ${type}`;
        notif.innerHTML = `<p>${message}</p>`;
        notificationContainer.appendChild(notif);
        setTimeout(() => { notif.classList.add('fade-out'); setTimeout(() => notif.remove(), 500); }, duration);
    }

    const applyLocales = () => {
        if (!Loc || Object.keys(Loc).length === 0) return;
        document.querySelectorAll('[data-locale]').forEach(el => {
            const key = el.getAttribute('data-locale');
            if (Loc[key]) el.textContent = Loc[key];
        });
    };

    const switchPage = (pageId) => {
        showLoader();
        pages.forEach(p => p.classList.remove('active'));
        document.getElementById(pageId).classList.add('active');
        navLinks.forEach(l => l.classList.remove('active'));
        document.querySelector(`.nav-link[data-page="${pageId}"]`).classList.add('active');
        setTimeout(hideLoader, 300);
    };

    const resetInputs = () => {
        document.getElementById('pin-set-input').value = '';
        document.getElementById('pin-login-input').value = '';
        document.getElementById('deposit-amount').value = '';
        document.getElementById('withdraw-amount').value = '';
        document.getElementById('transfer-id').value = '';
        document.getElementById('transfer-amount').value = '';
    };
    
    const showBankUI = (shouldShow) => bankContainer.style.display = shouldShow ? 'flex' : 'none';
    const showLoginUI = (shouldShow) => loginContainer.style.display = shouldShow ? 'block' : 'none';

    const applyTheme = (theme) => {
        document.body.classList.toggle('light-mode', theme === 'light');
        if (themeToggle) {
            themeToggle.checked = theme === 'light';
        }
    };

    const updateAllBalances = (balance) => {
        const formattedBalance = `$${Number(balance).toLocaleString('en-US')}`;
        document.querySelectorAll('.balance-display, #dashboard-balance').forEach(el => el.textContent = formattedBalance);
    };

    const populatePlayerData = () => {
        document.getElementById('profile-name').textContent = currentPlayerData.playerName;
        document.getElementById('profile-id').textContent = `ID: ${currentPlayerData.accountNumber.slice(0, 15)}...`;
        document.getElementById('card-holder').textContent = currentPlayerData.playerName;
        document.getElementById('card-number').textContent = `•••• •••• •••• ${currentPlayerData.accountNumber.slice(-4)}`;
        document.getElementById('acc-number').textContent = currentPlayerData.accountNumber;
        document.getElementById('acc-created').textContent = new Date().toLocaleDateString('en-GB');
        updateAllBalances(currentPlayerData.bank);
    };
    
    const renderDashboardChart = (transactions) => {
        const ctx = document.getElementById('dashboard-chart').getContext('2d');
        if (window.myDashboardChart) window.myDashboardChart.destroy();

        const labels = [];
        const incomeData = [];
        const expenseData = [];
        for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            labels.push(d.toLocaleDateString('en-US', { weekday: 'short' }));
            incomeData.push(0);
            expenseData.push(0);
        }

        transactions.forEach(tx => {
            const txDate = new Date(tx.date);
            const diffDays = Math.floor((new Date() - txDate) / (1000 * 60 * 60 * 24));
            if (diffDays >= 0 && diffDays < 7) {
                const index = 6 - diffDays;
                if (tx.type === 'deposit') incomeData[index] += tx.amount;
                else expenseData[index] += tx.amount;
            }
        });

        window.myDashboardChart = new Chart(ctx, {
            type: 'bar',
            data: { labels: labels, datasets: [ { label: Loc['stats_chart_label_income'], data: incomeData, backgroundColor: 'rgba(40, 255, 191, 0.6)' }, { label: Loc['stats_chart_label_expense'], data: expenseData, backgroundColor: 'rgba(255, 77, 77, 0.6)' } ] },
            options: { responsive: true, maintainAspectRatio: false, scales: { x: { display: false }, y: { display: false } }, plugins: { legend: { display: false }, tooltip: { enabled: true } } }
        });
    };
    
    const renderFullStats = (transactions) => {
        const canvasEl = document.getElementById('stats-pie-chart');
        const noDataEl = document.getElementById('stats-no-data');
        let totalIncome = 0;
        let totalExpense = 0;

        if (!transactions || transactions.length === 0) {
            canvasEl.style.display = 'none';
            noDataEl.style.display = 'flex';
        } else {
            canvasEl.style.display = 'block';
            noDataEl.style.display = 'none';
            transactions.forEach(tx => tx.type === 'deposit' ? totalIncome += tx.amount : totalExpense += tx.amount);
        }

        if (window.myPieChart) window.myPieChart.destroy();
        
        document.getElementById('stats-total-income').textContent = `$${totalIncome.toLocaleString('en-US')}`;
        document.getElementById('stats-total-expense').textContent = `-$${totalExpense.toLocaleString('en-US')}`;
        const netChange = totalIncome - totalExpense;
        document.getElementById('stats-net-change').textContent = `${netChange >= 0 ? '+' : ''}$${netChange.toLocaleString('en-US')}`;
        document.getElementById('stats-net-change').className = `value ${netChange >= 0 ? 'income' : 'expense'}`;
        
        if (transactions && transactions.length > 0) {
            window.myPieChart = new Chart(canvasEl.getContext('2d'), {
                type: 'pie',
                data: {
                    labels: [Loc['stats_chart_label_income'], Loc['stats_chart_label_expense']],
                    datasets: [{
                        label: Loc['stats_chart_title'],
                        data: [totalIncome, totalExpense],
                        backgroundColor: ['rgba(40, 255, 191, 0.7)', 'rgba(255, 77, 77, 0.7)'],
                        borderColor: [Cfg.LightMode ? '#fff' : '#272734'],
                        borderWidth: 3
                    }]
                },
                options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { color: '#A0AEC0', font: { size: 14 } } } } }
            });
        }
    };

    const renderHistoryTable = (transactions, currentBalance) => {
        const tbody = document.getElementById('history-table-body');
        const noDataEl = document.getElementById('history-no-data');
        const table = tbody.closest('table');
        
        tbody.innerHTML = '';
        if (!transactions || transactions.length === 0) {
            table.style.display = 'none';
            noDataEl.style.display = 'flex';
            return;
        }

        table.style.display = 'table';
        noDataEl.style.display = 'none';
        
        let runningBalance = currentBalance;
        transactions.forEach(tx => {
            const row = document.createElement('tr');
            const isDeposit = tx.type === 'deposit';
            row.innerHTML = `
                <td>${new Date(tx.date).toLocaleString('id-ID', {day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit'})}</td>
                <td class="description">${tx.description || 'N/A'}</td>
                <td class="${isDeposit ? 'amount-deposit' : 'amount-withdraw'}">${isDeposit ? '+' : '-'} $${tx.amount.toLocaleString('en-US')}</td>
                <td>$${Math.round(runningBalance).toLocaleString('en-US')}</td>
            `;
            tbody.appendChild(row);
            runningBalance += isDeposit ? -tx.amount : tx.amount;
        });
    };

    const renderDashboardActivity = (transactions) => {
        const activityList = document.getElementById('activity-list');
        activityList.innerHTML = '';
        if (!transactions || transactions.length === 0) {
             activityList.innerHTML = `<li class="activity-item">${Loc['history_no_transactions']}</li>`;
             return;
        }

        transactions.slice(0, 4).forEach(tx => {
            const li = document.createElement('li');
            li.className = 'activity-item';
            const isDeposit = tx.type === 'deposit';
            li.innerHTML = `<div class="icon ${isDeposit ? 'deposits' : 'withdrawals'}"><i class="fas fa-dollar-sign"></i></div><div class="activity-info"><span class="type">${isDeposit ? Loc['activity_deposit'] : Loc['activity_withdraw']}</span><span class="date">${tx.description}</span></div><span class="activity-amount ${isDeposit ? 'income' : 'expense'}">${isDeposit ? '+' : '-'} $${tx.amount.toLocaleString('en-US')}</span>`;
            activityList.appendChild(li);
        });
    };
    
    const updateAllVisuals = (transactions) => {
        renderDashboardActivity(transactions);
        renderDashboardChart(transactions);
        renderHistoryTable(transactions, currentPlayerData.bank);
        renderFullStats(transactions);
    }

    themeToggle.addEventListener('change', () => {
        const newTheme = themeToggle.checked ? 'light' : 'dark';
        localStorage.setItem('bankTheme', newTheme);
        applyTheme(newTheme);
    });

    navLinks.forEach(link => link.addEventListener('click', (e) => { e.preventDefault(); switchPage(link.dataset.page); }));
    quickAmountButtons.forEach(button => button.addEventListener('click', () => { document.querySelector(button.dataset.targetInput).value = button.dataset.amount; }));
    document.querySelectorAll('[data-nav]').forEach(button => button.addEventListener('click', () => switchPage(button.dataset.nav)));
    closeBtn.addEventListener('click', () => post('close'));

    document.getElementById('set-pin-btn').addEventListener('click', () => {
        const pin = document.getElementById('pin-set-input').value;
        if (pin && pin.length === 4) {
            post('setPin', { pin });
            pinSetupView.style.display = 'none';
            pinLoginView.style.display = 'block';
            document.getElementById('pin-login-input').focus();
            showNotification(Loc['notify_pin_set'], 'success');
        } else {
            showNotification(Loc['notify_pin_invalid'], 'error');
        }
    });

    document.getElementById('login-btn').addEventListener('click', () => {
        const pin = document.getElementById('pin-login-input').value;
        if (pin === correctPin) {
            showLoader();
            showLoginUI(false);
            populatePlayerData();
            showBankUI(true);
            switchPage('dashboard');
            post('getTransactionHistory');
        } else {
            showNotification(Loc['notify_pin_wrong'], 'error');
            document.getElementById('pin-login-input').value = '';
        }
    });
    
    document.getElementById('deposit-btn').addEventListener('click', () => {
        const amount = document.getElementById('deposit-amount').value;
        if (amount > 0) { showLoader(); post('deposit', { amount }); } 
        else { showNotification(Loc['notify_deposit_invalid'], 'error'); }
    });

    document.getElementById('withdraw-btn').addEventListener('click', () => {
        const amount = document.getElementById('withdraw-amount').value;
        if (amount > 0) { showLoader(); post('withdraw', { amount }); }
        else { showNotification(Loc['notify_withdraw_invalid'], 'error'); }
    });

    document.getElementById('transfer-btn').addEventListener('click', () => {
        const targetId = document.getElementById('transfer-id').value;
        const amount = document.getElementById('transfer-amount').value;
        if (targetId && amount > 0) { showLoader(); post('transfer', { targetId, amount }); }
        else { showNotification(Loc['notify_transfer_invalid'], 'error'); }
    });

    window.addEventListener('message', (event) => {
        const { action, data } = event.data;
        switch(action) {
            case 'open':
                Cfg = data.config;
                Loc = data.locale;
                currentPlayerData = data.accountData;
                correctPin = data.accountData.pin;
                
                document.getElementById('main-bank-name').textContent = Cfg.BankName;
                document.getElementById('login-bank-name').textContent = Cfg.BankName;
                applyLocales();
                
                const savedTheme = localStorage.getItem('bankTheme') || 'dark';
                applyTheme(savedTheme);
                
                showLoginUI(true);
                pinSetupView.style.display = data.accountData.hasPin ? 'none' : 'block';
                pinLoginView.style.display = data.accountData.hasPin ? 'block' : 'none';
                if(data.accountData.hasPin) document.getElementById('pin-login-input').focus();
                else document.getElementById('pin-set-input').focus();
                break;
            case 'close':
                showBankUI(false);
                showLoginUI(false);
                break;
            case 'updateTransactions':
                currentPlayerData.transactions = data;
                updateAllVisuals(data);
                hideLoader();
                break;
            case 'transactionSuccess':
                hideLoader();
                currentPlayerData.bank = data.newBalance;
                updateAllBalances(data.newBalance);
                resetInputs();
                switchPage('dashboard');
                post('getTransactionHistory');
                showNotification(data.message, 'success');
                break;
            case 'transactionFail':
                hideLoader();
                showNotification(data.message, 'error');
                break;
        }
    });
    
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') post('close'); });
});