import WalletConnect from '@walletconnect/client'
import WalletConnectV2 from '@walletconnect/sign-client'
// import { ethers } from 'ethers'

const WalletMetadata = {
  description: 'Paytaca App',
  url: 'https://paytaca.com',
  icons: ['https://walletconnect.org/walletconnect-logo.png'],
  name: 'Paytaca'
}

// TODO: refactor
export function getPreviousConnector (manager) {
  const wcInfoString = localStorage.getItem('walletconnect')
  if (wcInfoString) {
    const wcInfo = JSON.parse(wcInfoString)
    return new WalletConnect(wcInfo)
  }

  const wc2InfoString = localStorage.getItem('wc@2:client:0.3//session')
  if (wc2InfoString) {
    // const wcInfo = JSON.parse(wc2InfoString)
    // return new WalletConnect(wcInfo)
    const _client = new WalletConnectV2({
      projectId: "3fd234b8e2cd0e1da4bc08a0011bbf64",
      metadata: WalletMetadata
    });

    _client.initialize().then(async () => {
      const sessions = _client.session.getAll();
      // console.log(sessions)
      if (sessions.length) {
        const lastKeyIndex = sessions.length - 1;
        // console.log(lastKeyIndex)
        const session = sessions[lastKeyIndex];
        _client._peerMeta = session.peer.metadata;
        _client.accounts = session.namespaces?.bch?.accounts.map(val => val.split(":").slice(2).join())
        // console.log(_client._peerMeta)


        // _client.on(
        //   "session_proposal",
        //   async (proposal) => {
        //     console.log(2, "session_proposal", proposal)
        //     const { id, requiredNamespaces, optionalNamespaces, pairingTopic, proposer, relays } = proposal.params;
        //     const namespaces = {};

        //     _client._peerMeta = proposer.metadata;
        //     _client.accounts = [this.wallet.sBCH._wallet.address];

        //           const { acknowledged } = await _client.approve({
        //             id,
        //             relayProtocol: relays[0].protocol,
        //             namespaces,
        //           });
        //           await acknowledged();
        //   },
        // );

        // await _client.connect({ pairingTopic: session.pairingTopic });//.then(({ approval }) => {
          // console.log(_client.session);
          await _client.connect(session)
          _client._session = session;
          // console.log(1, approval)

        // approval();
        _client.events.emit("metadata_update", undefined, session.peer.metadata);

        // console.log(2)
        // });
      }
    });

    return _client;
  }
}

export function createConnector (uri) {
  if (uri.indexOf("@2") !== -1) {
    const connector = new WalletConnectV2(
      {
        // Required
        uri: uri,
        // Required
        metadata: WalletMetadata,
        // logger: console,
        projectId: "3fd234b8e2cd0e1da4bc08a0011bbf64"
      }
    )
    return connector
  }

  // Create connector
  const connector = new WalletConnect(
    {
      // Required
      uri: uri,
      // Required
      clientMeta: WalletMetadata,
    }
  )

  return connector
}

/**
  * @param {object}         payload a JSON-RPC request
  * @param {ethers.Wallet}  wallet  a Wallet instance
*/
export async function callRequestHandler (connector, payload, wallet) {
  let result = null
  let error = null
  try {
    switch (payload.method) {
      case ('personal_sign'):
      case ('eth_sign'):
        // eslint-disable-next-line no-case-declarations
        const signedMessage = await wallet.signMessage(payload.params[0])
        result = signedMessage
        break
      case ('eth_signTypedData'):
        // eslint-disable-next-line no-case-declarations
        const parsedSignTypedDataParams = JSON.parse(payload.params[1])
        if (parsedSignTypedDataParams.types.EIP712Domain) delete parsedSignTypedDataParams.types.EIP712Domain
        // eslint-disable-next-line no-case-declarations
        const signedTypedData = await wallet._signTypedData(
          parsedSignTypedDataParams.domain,
          parsedSignTypedDataParams.types,
          parsedSignTypedDataParams.message
        )
        result = signedTypedData
        break
      case ('eth_sendTransaction'):
        // eslint-disable-next-line no-case-declarations
        const tx = await wallet.sendTransaction(serializeTransactionRequest(payload.params[0]))
        result = tx.hash
        break
      case ('eth_signTransaction'):
        // eslint-disable-next-line no-case-declarations
        const signedTx = await wallet.signTransaction(serializeTransactionRequest(payload.params[0]))
        result = signedTx
        break
      default:
        error = { message: 'Unknown method' }
    }
  } catch (err) {
    error = err
  }

  const response = {
    success: false,
    requestPayload: payload
  }

  if (result !== null) {
    response.success = true
    response.result = result
    connector.approveRequest({ id: payload.id, jsonrpc: payload.jsonrpc, result: result })
  } else {
    response.success = false
    response.error = error
    connector.rejectRequest({ id: payload.id, jsonrpc: payload.jsonrpc, error: error })
  }

  return response
}

function serializeTransactionRequest (payload) {
  if (!payload) return payload
  const data = {
    from: payload.from,
    to: payload.to,
    value: payload.value,
    data: payload.data,
    gasLimit: payload.gas,
    gasPrice: payload.gasPrice,
    nonce: payload.nonce
  }

  return data
}

export function isValidWalletConnectUri (uri) {
  if (!uri) return false

  return /wc:[0-9a-f-]*@\d*\?(bridge=.*|key=[0-9a-f]*)/i.test(uri)
}

export function parseWalletConnectUri (uri) {
  if (!uri) return

  const data = {
    uri: uri,
    handshakeTopic: '',
    version: '',
    bridge: '',
    key: ''
  }

  // wc:748356ab-d957-4004-82f9-c792a6a7e532@1?bridge=https%3A%2F%2Fo.bridge.walletconnect.org&key=4c70909685f81bc6cd15e10436a335294c433795d6ac7fc1934b969a96c292b5
  const match = String(uri).match(/^wc:([0-9a-f-]{36})@(\d*)(\?(bridge=.*)|(key=[0-9a-f]*))?$/i)
  if (match) {
    const url = new URL(uri)
    data.handshakeTopic = match[1]
    data.version = match[2]
    data.bridge = url.searchParams.get('bridge')
    data.key = url.searchParams.get('key')

    return data
  }

  // wc:22c73d8c3888d802ee73cfbb54f3f681312835b35a2bf49536a196d577ddc944@2?relay-protocol=irn&symKey=c5e7509411aa61e28e517b656fbf64145a51a00825d85ad898939c3f5f41fb68
  const matchv2 = String(uri).match(/^wc:([0-9a-f-]{64})@(\d*)(\?(relay-protocol=.*)|(symKey=[0-9a-f]*))?$/i)
  if (matchv2) {
    const url = new URL(uri)
    data.handshakeTopic = matchv2[1]
    data.version = matchv2[2]
    data.bridge = "wss://relay.walletconnect.com";
    data.key = url.searchParams.get('symKey')

    return data
  }
}

export class WalletConnectManager {
  // store is the vuex instance of the app
  constructor (store) {
    this.store = store
    this._listeners = {}
    this._subscribedListeners = []

    this.connector = getPreviousConnector()
  }

  get connector () {
    return this._connector
  }

  /**
   * @param {WalletConnect} value
  */
  set connector (value) {
    // remove previous connector's event emmiters before updating
    if (this._connector) this._disconnectConnectorEvents()
    this._connector = value
    if (this._connector) this._attachEventsToConnector()
  }

  _attachEventsToConnector () {
    if (!this.connector) return
    this._attachEventToConnector('session_request')
    this._attachEventToConnector('call_request')
    this._attachEventToConnector('disconnect')
    this._attachEventToConnector('metadata_update')
  }

  _attachEventToConnector (eventName) {
    if (!this.connector) return
    const _eventName = String(eventName)
    if (this._isSubscribedTo(_eventName)) return

    const callback = (error, payload) => {
      this._connectorEventHandler(_eventName, error, payload)
    }
    this.connector.on(_eventName, callback)
    this._listeners[_eventName] = callback
  }

  _isSubscribedTo (eventName = '') {
    if (!this.connector) return false

    const listener = this._listeners[eventName]
    if (!listener) return false

    if (!Array.isArray(this.connector?._eventManager?._eventEmmiters)) return false
    return this.connector._eventManager._eventEmmiters.some(eventEmmiter => eventEmmiter?.callback === listener)
  }

  _connectorEventHandler (eventName, error, payload) {
    console.log(eventName, error, payload);

    // convert to v1
    if (eventName === 'session_request') {
      eventName = 'call_request';
      const v2EventPayload = error.params.request;
      payload = v2EventPayload;
      error = undefined;
    }

    if (eventName === 'call_request' && payload) {
      this.store.commit('walletconnect/addCallRequest', {
        timestamp: Date.now(),
        payload: payload
      })
    } else if (eventName === 'disconnect' && !error) {
      this.store.commit('walletconnect/clearCallRequests')
      this.connector = null
    }

    this._subscribedListeners.forEach(listener => {
      if (listener?.event !== eventName) return
      if (listener?.callback?.call) listener.callback(error, payload)
    })
  }

  _disconnectConnectorEvents () {
    if (!this.connector) return
    ['session_request', 'call_request', 'disconnect', 'metadata_update'].forEach(eventName => {
      if (this._isSubscribedTo(eventName)) {
        this.connector._eventManager._eventEmmiters = this.connector._eventManager._eventEmmiters
          .filter(eventEmmiter => eventEmmiter.event !== eventName && eventEmmiter.callback !== this._listeners[eventName])

        delete this._listeners[eventName]
      }
    })
  }

  disconnectConnector () {
    if (!this.connector) return
    this.connector.killSession()
    this.connector = null
  }

  /**
   * Add a listener to an event
   * @param {String} eventName
   * @param {Function} callback
   */
  addEventListener (eventName, callback) {
    const _eventName = String(eventName)
    const exists = this._subscribedListeners.some(listener => listener.event === _eventName && listener.callback === callback)
    if (!exists) {
      this._subscribedListeners.push({
        event: _eventName,
        callback: callback
      })
    }
  }

  /**
   * Removes a listener to an event. If callback is not specified, all listeners are removed
   * @param {String} eventName
   * @param {Function} callback
   */
  removeEventListener (eventName, callback) {
    const _eventName = String(eventName)
    if (callback === undefined) {
      this._subscribedListeners = this._subscribedListeners.filter(listener => listener.event !== _eventName)
    } else {
      const listener = this._subscribedListeners.find(
        listener => listener.event === _eventName && listener.callback === callback
      )
      this._subscribedListeners = this._subscribedListeners.filter(_listener => _listener !== listener)
    }
  }
}
