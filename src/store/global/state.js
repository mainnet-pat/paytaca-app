export default function () {
  return {
    network: 'BCH', // BCH || sBCH
    isChipnet: false,
    wallets: {
      bch: {
        walletHash: '',
        derivationPath: '',
        xPubKey: '',
        lastAddress: '',
        lastChangeAddress: '',
        lastAddressIndex: 0,
        connectedAddress: '',
        connectedAddressIndex: '0/0',
        connectedSites: {}
      },
      slp: {
        walletHash: '',
        derivationPath: '',
        xPubKey: '',
        lastAddress: '',
        lastChangeAddress: '',
        lastAddressIndex: 0,
        connectedAddress: '',
        connectedAddressIndex: '0/0',
        connectedSites: {}
      },
      sbch: {
        subscribed: false,
        walletHash: '',
        derivationPath: '',
        lastAddress: '',
        connectedAddress: '',
        connectedAddressIndex: '0/0',
        connectedSites: {}
      }
    },
    chipnet__wallets: {
      bch: {
        walletHash: '',
        derivationPath: '',
        xPubKey: '',
        lastAddress: '',
        lastChangeAddress: '',
        lastAddressIndex: 0,
        connectedAddress: '',
        connectedAddressIndex: '0/0',
        connectedSites: {}
      },
      slp: {
        walletHash: '',
        derivationPath: '',
        xPubKey: '',
        lastAddress: '',
        lastChangeAddress: '',
        lastAddressIndex: 0,
        connectedAddress: '',
        connectedAddressIndex: '0/0',
        connectedSites: {}
      }
    },
    utxoScanTasks: {
      // <walletHash>: { taskId: '', timestamp: 0, lastUpdate: 0, status: '', queueInfo: ... },
      '86f684f477079124f75e385384b42edec8a35ec73f666262528da1e045fc6e85': {
        taskId: '37c23f84-5271-43f4-a569-c9152fd8e535',
        timestamp: 1668062253501,
        lastUpdate: 1668062253501,
        status: '',
        dateDone: 0,
        queueInfo: undefined,
      }
    },
    user: {
      onboardingStep: 0,
      firstName: '',
      lastName: '',
      email: '',
      mobileNumber: ''
    },
    online: null
  }
}
