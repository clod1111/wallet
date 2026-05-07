"use client";

import { useState } from "react";
import { ethers } from "ethers";

const TOKENS = [
  {
    name: "USDT",
    symbol: "USDT",
    address: "0xdAC17F958D2ee523a2206206994597C13D831ec7",
  },
  {
    name: "USDC",
    symbol: "USDC",
    address: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
  },
  {
    name: "DAI",
    symbol: "DAI",
    address: "0x6B175474E89094C44Da98b954EedeAC495271d0F",
  },
];

const ERC20_ABI = [
  "function balanceOf(address owner) view returns (uint256)",
  "function decimals() view returns (uint8)",
];

export default function Home() {
  const [walletAddress, setWalletAddress] = useState("");
  const [balance, setBalance] = useState("");
  const [network, setNetwork] = useState("");
  const [tokenBalances, setTokenBalances] = useState<any[]>([]);
  const [toAddress, setToAddress] = useState("");
  const [amount, setAmount] = useState("");
  const [status, setStatus] = useState("");

  async function connectWallet() {
    try {
      if (!(window as any).ethereum) {
        alert("Install MetaMask first");
        return;
      }

      const provider = new ethers.BrowserProvider((window as any).ethereum);
      const accounts = await provider.send("eth_requestAccounts", []);
      const address = accounts[0];

      setWalletAddress(address);

      const walletBalance = await provider.getBalance(address);
      setBalance(Number(ethers.formatEther(walletBalance)).toFixed(6));

      const networkData = await provider.getNetwork();
      setNetwork(networkData.name);

      await loadTokenBalances(provider, address);

      setStatus("Wallet connected successfully.");
    } catch (error) {
      console.log(error);
      setStatus("Wallet connection failed.");
    }
  }

  async function loadTokenBalances(provider: ethers.BrowserProvider, address: string) {
    try {
      const balances = [];

      for (const token of TOKENS) {
        const contract = new ethers.Contract(
          token.address,
          ERC20_ABI,
          provider
        );

        const rawBalance = await contract.balanceOf(address);
        const decimals = await contract.decimals();

        balances.push({
          ...token,
          balance: Number(
            ethers.formatUnits(rawBalance, decimals)
          ).toFixed(4),
        });
      }

      setTokenBalances(balances);
    } catch (error) {
      console.log(error);
      setStatus("Could not load token balances. Make sure you are on Ethereum mainnet.");
    }
  }

  function disconnectWallet() {
    setWalletAddress("");
    setBalance("");
    setNetwork("");
    setTokenBalances([]);
    setToAddress("");
    setAmount("");
    setStatus("Wallet disconnected.");
  }

  function copyAddress() {
    navigator.clipboard.writeText(walletAddress);
    setStatus("Address copied.");
  }

  async function refreshBalances() {
    try {
      if (!(window as any).ethereum || !walletAddress) return;

      const provider = new ethers.BrowserProvider((window as any).ethereum);

      const walletBalance = await provider.getBalance(walletAddress);
      setBalance(Number(ethers.formatEther(walletBalance)).toFixed(6));

      await loadTokenBalances(provider, walletAddress);

      setStatus("Balances refreshed.");
    } catch (error) {
      console.log(error);
      setStatus("Could not refresh balances.");
    }
  }

  async function sendETH() {
    try {
      if (!(window as any).ethereum) {
        alert("Install MetaMask first");
        return;
      }

      if (!ethers.isAddress(toAddress)) {
        alert("Enter a valid recipient address.");
        return;
      }

      if (!amount || Number(amount) <= 0) {
        alert("Enter a valid ETH amount.");
        return;
      }

      const confirmSend = confirm(
        `Send ${amount} ETH to ${toAddress}? This can use real money if you are on mainnet.`
      );

      if (!confirmSend) return;

      const provider = new ethers.BrowserProvider((window as any).ethereum);
      const signer = await provider.getSigner();

      setStatus("Waiting for wallet confirmation...");

      const tx = await signer.sendTransaction({
        to: toAddress,
        value: ethers.parseEther(amount),
      });

      setStatus("Transaction sent: " + tx.hash);

      await tx.wait();

      setStatus("Transaction confirmed.");
      await refreshBalances();
      setToAddress("");
      setAmount("");
    } catch (error) {
      console.log(error);
      setStatus("Transaction failed or cancelled.");
    }
  }

  return (
    <main style={main}>
      <section style={container}>
        <p style={tag}>Web3 Token Dashboard</p>

        <h1 style={title}>My Crypto Wallet App</h1>

        <p style={subtitle}>
          Connect your wallet, view ETH and token balances, and send ETH.
        </p>

        {!walletAddress ? (
          <button onClick={connectWallet} style={primaryButton}>
            Connect MetaMask
          </button>
        ) : (
          <button onClick={disconnectWallet} style={dangerButton}>
            Disconnect Wallet
          </button>
        )}

        {walletAddress && (
          <div style={grid}>
            <div style={card}>
              <h2>Wallet</h2>

              <p style={label}>Address</p>
              <p style={value}>
                {walletAddress.slice(0, 6)}...
                {walletAddress.slice(-4)}
              </p>

              <p style={label}>ETH Balance</p>
              <p style={bigValue}>{balance} ETH</p>

              <p style={label}>Network</p>
              <p style={value}>{network}</p>

              <div style={buttonRow}>
                <button onClick={copyAddress} style={smallButton}>
                  Copy
                </button>

                <button onClick={refreshBalances} style={smallButton}>
                  Refresh
                </button>
              </div>
            </div>

            <div style={card}>
              <h2>Token Balances</h2>

              {tokenBalances.length === 0 ? (
                <p style={label}>
                  No token data loaded.
                </p>
              ) : (
                tokenBalances.map((token) => (
                  <div key={token.symbol} style={tokenRow}>
                    <span>{token.symbol}</span>
                    <strong>{token.balance}</strong>
                  </div>
                ))
              )}

              <p style={warning}>
                Token balances currently use Ethereum mainnet token contracts.
              </p>
            </div>

            <div style={card}>
              <h2>Send ETH</h2>

              <input
                value={toAddress}
                onChange={(e) => setToAddress(e.target.value)}
                placeholder="Recipient address"
                style={input}
              />

              <input
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Amount in ETH"
                style={input}
              />

              <button onClick={sendETH} style={primaryButton}>
                Send ETH
              </button>

              <p style={warning}>
                Be careful: mainnet transactions use real crypto.
              </p>
            </div>
          </div>
        )}

        {status && <div style={statusBox}>{status}</div>}
      </section>
    </main>
  );
}

const main = {
  minHeight: "100vh",
  background:
    "radial-gradient(circle at top, #1e3a8a 0%, #0f172a 45%, #020617 100%)",
  color: "white",
  fontFamily: "Arial",
  padding: "40px 20px",
};

const container = {
  maxWidth: "1100px",
  margin: "0 auto",
  textAlign: "center" as const,
};

const tag = {
  color: "#38bdf8",
  fontWeight: "bold",
};

const title = {
  fontSize: "52px",
  marginBottom: "10px",
};

const subtitle = {
  color: "#cbd5e1",
  marginBottom: "30px",
};

const grid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
  gap: "24px",
  marginTop: "35px",
};

const card = {
  background: "rgba(30, 41, 59, 0.85)",
  border: "1px solid rgba(148, 163, 184, 0.2)",
  borderRadius: "22px",
  padding: "28px",
  boxShadow: "0 20px 60px rgba(0,0,0,0.35)",
};

const primaryButton = {
  background: "#38bdf8",
  color: "#020617",
  border: "none",
  padding: "13px 24px",
  borderRadius: "14px",
  cursor: "pointer",
  fontWeight: "bold",
  fontSize: "16px",
};

const dangerButton = {
  background: "#ef4444",
  color: "white",
  border: "none",
  padding: "13px 24px",
  borderRadius: "14px",
  cursor: "pointer",
  fontWeight: "bold",
  fontSize: "16px",
};

const smallButton = {
  background: "#334155",
  color: "white",
  border: "none",
  padding: "10px 16px",
  borderRadius: "12px",
  cursor: "pointer",
};

const buttonRow = {
  display: "flex",
  gap: "10px",
  justifyContent: "center",
};

const input = {
  width: "100%",
  padding: "14px",
  marginTop: "12px",
  borderRadius: "12px",
  border: "1px solid #475569",
  background: "#0f172a",
  color: "white",
};

const label = {
  color: "#94a3b8",
  fontSize: "13px",
  marginTop: "18px",
};

const value = {
  fontSize: "18px",
};

const bigValue = {
  fontSize: "30px",
  fontWeight: "bold",
};

const tokenRow = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  padding: "14px 0",
  borderBottom: "1px solid rgba(148, 163, 184, 0.2)",
};

const warning = {
  color: "#fbbf24",
  fontSize: "13px",
  marginTop: "15px",
};

const statusBox = {
  marginTop: "30px",
  background: "rgba(15, 23, 42, 0.85)",
  border: "1px solid rgba(148, 163, 184, 0.2)",
  borderRadius: "14px",
  padding: "15px",
  color: "#cbd5e1",
};