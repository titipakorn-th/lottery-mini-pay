"use client";

/* eslint-disable react-hooks/exhaustive-deps */
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useWeb3 } from "@/contexts/useWeb3";
import Image from "next/image";
import { useEffect, useState, useRef } from "react";

export default function Home() {
    const {
        address,
        getUserAddress,
        sendCUSD,
        mintMinipayNFT,
        getNFTs,
        signTransaction,
    } = useWeb3();

    const [cUSDLoading, setCUSDLoading] = useState(false);
    const [nftLoading, setNFTLoading] = useState(false);
    const [signingLoading, setSigningLoading] = useState(false);
    const [userOwnedNFTs, setUserOwnedNFTs] = useState<string[]>([]);
    const [tx, setTx] = useState<any>(undefined);
    const [amountToSend, setAmountToSend] = useState<string>("0.1");
    const [messageSigned, setMessageSigned] = useState<boolean>(false); // State to track if a message was signed
    const [showDevTools, setShowDevTools] = useState<boolean>(false);
    const [consoleOutput, setConsoleOutput] = useState<string[]>([]);
    const consoleRef = useRef<HTMLDivElement>(null);

    // Override console methods to capture logs
    useEffect(() => {
        const originalConsoleLog = console.log;
        const originalConsoleError = console.error;
        const originalConsoleWarn = console.warn;
        
        // Custom serializer for handling BigInt
        const safeStringify = (obj: any) => {
            return JSON.stringify(obj, (key, value) => {
                // Check if value is BigInt and convert to string representation
                if (typeof value === 'bigint') {
                    return value.toString() + 'n'; // append 'n' to indicate this was a BigInt
                }
                return value;
            });
        };
        
        const formatArg = (arg: any) => {
            if (arg === null) return 'null';
            if (arg === undefined) return 'undefined';
            if (typeof arg === 'bigint') return arg.toString() + 'n';
            if (typeof arg === 'object') {
                try {
                    return safeStringify(arg);
                } catch (e) {
                    return '[Object that cannot be serialized]';
                }
            }
            return String(arg);
        };
        
        console.log = (...args) => {
            setConsoleOutput(prev => [...prev, `LOG: ${args.map(formatArg).join(' ')}`]);
            originalConsoleLog(...args);
        };
        
        console.error = (...args) => {
            setConsoleOutput(prev => [...prev, `ERROR: ${args.map(formatArg).join(' ')}`]);
            originalConsoleError(...args);
        };
        
        console.warn = (...args) => {
            setConsoleOutput(prev => [...prev, `WARN: ${args.map(formatArg).join(' ')}`]);
            originalConsoleWarn(...args);
        };
        
        return () => {
            console.log = originalConsoleLog;
            console.error = originalConsoleError;
            console.warn = originalConsoleWarn;
        };
    }, []);

    // Scroll to bottom when console output changes
    useEffect(() => {
        if (consoleRef.current) {
            consoleRef.current.scrollTop = consoleRef.current.scrollHeight;
        }
    }, [consoleOutput]);

    // Toggle dev tools visibility
    const toggleDevTools = () => {
        setShowDevTools(!showDevTools);
    };

    // Clear console output
    const clearConsole = () => {
        setConsoleOutput([]);
    };

    useEffect(() => {
        getUserAddress();
    }, []);

    useEffect(() => {
        const getData = async () => {
            const tokenURIs = await getNFTs();
            setUserOwnedNFTs(tokenURIs);
        };
        if (address) {
            getData();
        }
    }, [address]);

    async function sendingCUSD() {
        if (address) {
            setSigningLoading(true);
            try {
                const tx = await sendCUSD(address, amountToSend);
                setTx(tx);
            } catch (error) {
                console.log(error);
            } finally {
                setSigningLoading(false);
            }
        }
    }

    async function signMessage() {
        setCUSDLoading(true);
        try {
            await signTransaction();
            setMessageSigned(true);
        } catch (error) {
            console.log(error);
        } finally {
            setCUSDLoading(false);
        }
    }


    async function mintNFT() {
        setNFTLoading(true);
        try {
            const tx = await mintMinipayNFT();
            const tokenURIs = await getNFTs();
            setUserOwnedNFTs(tokenURIs);
            setTx(tx);
        } catch (error) {
            console.log(error);
        } finally {
            setNFTLoading(false);
        }
    }



    return (
        <div className="flex flex-col justify-center items-center">
            {/* Dev Tools Toggle Button - Fixed at bottom right */}
            <button 
                onClick={toggleDevTools}
                className="fixed bottom-4 right-4 bg-gray-800 text-white p-2 rounded-md z-50 hover:bg-gray-700"
            >
                {showDevTools ? "Hide DevTools" : "Show DevTools"}
            </button>

            {/* Dev Tools Console - Fixed at bottom of screen */}
            {showDevTools && (
                <div className="fixed bottom-16 left-0 right-0 bg-gray-900 text-white z-40 h-64 border-t border-gray-700">
                    <div className="flex justify-between items-center p-2 bg-gray-800 border-b border-gray-700">
                        <h3 className="font-mono font-bold">Console</h3>
                        <button 
                            onClick={clearConsole}
                            className="bg-red-600 text-white px-2 py-1 rounded text-sm hover:bg-red-700"
                        >
                            Clear
                        </button>
                    </div>
                    <div 
                        ref={consoleRef}
                        className="h-56 overflow-y-auto p-2 font-mono text-sm"
                    >
                        {consoleOutput.length > 0 ? (
                            consoleOutput.map((line, index) => (
                                <div key={index} className={`
                                    ${line.startsWith('ERROR') ? 'text-red-400' : 
                                      line.startsWith('WARN') ? 'text-yellow-400' : 'text-green-400'}
                                    mb-1
                                `}>
                                    {line}
                                </div>
                            ))
                        ) : (
                            <div className="text-gray-400 italic">Console is empty</div>
                        )}
                    </div>
                </div>
            )}

            {/* Main content with padding to make space for DevTools */}
            <div className={`w-full pb-${showDevTools ? '64' : '0'}`}>
                {!address && (
                    <div className="h1">Please install Metamask and connect.</div>
                )}
                {address && (
                    <div className="h1">
                        There you go... a canvas for your next Minipay project!
                    </div>
                )}

                <a
                    href="https://faucet.celo.org/alfajores"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-4 mb-4 rounded-full bg-white px-4 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
                >
                    Get Test Tokens
                </a>

                {address && (
                    <>
                        <div className="h2 text-center">
                            Your address:{" "}
                            <span className="font-bold text-sm">{address}</span>
                        </div>
                        {tx && (
                            <p className="font-bold mt-4">
                                Tx Completed:{" "}
                                <a
                                    href={`https://alfajores.celoscan.io/tx/${tx.transactionHash}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-600 underline"
                                >
                                    {tx.transactionHash.substring(0, 6)}...{tx.transactionHash.substring(tx.transactionHash.length - 6)}
                                </a>
                            </p>
                        )}
                        <div className="w-full px-3 mt-7">
                            <Input
                                type="number"
                                value={amountToSend}
                                onChange={(e) => setAmountToSend(e.target.value)}
                                placeholder="Enter amount to send"
                                className="border rounded-md px-3 py-2 w-full mb-3"
                            ></Input>
                            <Button
                                loading={signingLoading}
                                onClick={sendingCUSD}
                                title={`Send ${amountToSend} cUSD to your own address`}
                                widthFull
                            />
                        </div>

                        <div className="w-full px-3 mt-6">
                            <Button
                                loading={cUSDLoading}
                                onClick={signMessage}
                                title="Sign a Message"
                                widthFull
                            />
                        </div>

                        {messageSigned && (
                            <div className="mt-5 text-green-600 font-bold">
                                Message signed successfully!
                            </div>
                        )}

                        <div className="w-full px-3 mt-5">
                            <Button
                                loading={nftLoading}
                                onClick={mintNFT}
                                title="Mint Minipay NFT"
                                widthFull
                            />
                        </div>

                        {userOwnedNFTs.length > 0 ? (
                            <div className="flex flex-col items-center justify-center w-full mt-7">
                                <p className="font-bold">My NFTs</p>
                                <div className="w-full grid grid-cols-2 gap-3 mt-3 px-2">
                                    {userOwnedNFTs.map((tokenURI, index) => (
                                        <div
                                            key={index}
                                            className="p-2 border-[3px] border-colors-secondary rounded-xl"
                                        >
                                            <Image
                                                alt="MINIPAY NFT"
                                                src={tokenURI}
                                                className="w-[160px] h-[200px] object-cover"
                                                width={160}
                                                height={200}
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <div className="mt-5">You do not have any NFTs yet</div>
                        )}

                    </>
                )}
            </div>
        </div>
    );
}
