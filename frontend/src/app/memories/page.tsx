"use client";

import React, { useEffect, useState } from 'react';
import { getPeople, getPersonMemories } from '@/lib/api';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Calendar, MessageSquare, User, ArrowLeft, Clock, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function MemoriesPage() {
    const [people, setPeople] = useState<any[]>([]);
    const [selectedPerson, setSelectedPerson] = useState<any>(null);
    const [memories, setMemories] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const formatDate = (dateString: string) => {
        const stringToParse = dateString.endsWith('Z') || dateString.includes('+') ? dateString : `${dateString}Z`;
        return new Date(stringToParse).toLocaleString(undefined, {
            dateStyle: 'medium',
            timeStyle: 'short'
        });
    };

    const formatRelativeTime = (dateString: string) => {
        // Ensure the date is treated as UTC if it doesn't specify a timezone
        const stringToParse = dateString.endsWith('Z') || dateString.includes('+') ? dateString : `${dateString}Z`;
        const date = new Date(stringToParse);
        const now = new Date();
        const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
        const diffInDays = Math.floor(diffInSeconds / 86400);

        if (diffInDays > 7) {
            return date.toLocaleDateString(undefined, { dateStyle: 'medium' });
        }
        if (diffInDays >= 1) {
            return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;
        }
        const diffInHours = Math.floor(diffInSeconds / 3600);
        if (diffInHours >= 1) {
            return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
        }
        const diffInMinutes = Math.floor(diffInSeconds / 60);
        if (diffInMinutes >= 1) {
            return `${diffInMinutes} minute${diffInMinutes > 1 ? 's' : ''} ago`;
        }
        return 'Just now';
    };

    useEffect(() => {
        fetchPeople();
    }, []);

    const fetchPeople = async () => {
        try {
            const data = await getPeople();
            setPeople(data);
            setLoading(false);
        } catch (error) {
            console.error(error);
        }
    };

    const handlePersonClick = async (person: any) => {
        setSelectedPerson(person);
        try {
            const data = await getPersonMemories(person._id);
            setMemories(data);
        } catch (error) {
            console.error(error);
        }
    };

    return (
        <main className="min-h-screen bg-slate-50 text-slate-900 overflow-hidden relative selection:bg-slate-200">
            {/* Grid Background */}
            <div className="absolute inset-0 z-0 pointer-events-none">
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
                <div className="absolute left-0 bottom-0 -z-10 h-[500px] w-[500px] rounded-full bg-slate-400 opacity-5 blur-[120px]"></div>
            </div>

            <div className="container mx-auto px-4 py-8 max-w-6xl relative z-10">
                <header className="flex items-center justify-between mb-8 pb-6 border-b border-slate-200/60">
                    <div className="flex items-center gap-4">
                        <Link href="/">
                            <Button variant="ghost" size="icon" className="rounded-full hover:bg-slate-200/50">
                                <ArrowLeft className="h-5 w-5 text-slate-600" />
                            </Button>
                        </Link>
                        <div className="flex items-center gap-3">
                            <div className="h-8 w-8 bg-slate-900 rounded-md flex items-center justify-center shadow-sm">
                                <Sparkles className="h-4 w-4 text-white" />
                            </div>
                            <h1 className="text-xl font-bold tracking-tight text-slate-900">Social Context DB</h1>
                        </div>
                    </div>
                </header>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 h-[calc(100vh-140px)]">
                    {/* People List */}
                    <div className="md:col-span-1 flex flex-col gap-4 h-full">
                        <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest px-2">Known Faces</h2>
                        <ScrollArea className="flex-1 -mr-4 pr-4">
                            <div className="space-y-2 pb-4">
                                {people.map((p: any) => (
                                    <button
                                        key={p.person._id}
                                        onClick={() => handlePersonClick(p.person)}
                                        className={`w-full text-left p-3 rounded-xl border transition-all duration-200 group ${selectedPerson?._id === p.person._id
                                            ? 'bg-slate-900 border-slate-900 text-white shadow-lg shadow-slate-900/20'
                                            : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-sm'
                                            }`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className={`h-10 w-10 rounded-full flex items-center justify-center shrink-0 ${selectedPerson?._id === p.person._id ? 'bg-white/10 text-white' : 'bg-slate-100 text-slate-500 group-hover:bg-slate-200'}`}>
                                                <User className="h-5 w-5" />
                                            </div>
                                            <div className="min-w-0">
                                                <p className="font-bold truncate text-sm">{p.person.name}</p>
                                                <p className={`text-[10px] truncate ${selectedPerson?._id === p.person._id ? 'text-slate-400' : 'text-slate-400'}`}>
                                                    {p.latest_memory ? `Last met ${formatRelativeTime(p.latest_memory.timestamp)}` : 'No history'}
                                                </p>
                                            </div>
                                        </div>
                                    </button>
                                ))}
                                {loading && <p className="text-center text-xs text-slate-400 py-8 animate-pulse">Scanning database...</p>}
                            </div>
                        </ScrollArea>
                    </div>

                    {/* Memories History */}
                    <div className="md:col-span-2 h-full flex flex-col">
                        {selectedPerson ? (
                            <>
                                <div className="mb-6 flex items-baseline justify-between">
                                    <div>
                                        <h3 className="text-3xl font-bold tracking-tight text-slate-900">{selectedPerson.name}</h3>
                                        <p className="text-slate-400 text-xs font-mono mt-1">ID: {selectedPerson._id}</p>
                                    </div>
                                    <Badge variant="outline" className="text-[10px] py-1 px-3 border-slate-200 bg-white shadow-sm">
                                        {memories.length} Memories Stored
                                    </Badge>
                                </div>

                                <ScrollArea className="flex-1 -mr-4 pr-4">
                                    <div className="space-y-4 pb-12">
                                        {memories.map((m: any) => (
                                            <Card key={m._id} className="border-0 shadow-sm ring-1 ring-slate-200 bg-white/80 backdrop-blur-sm overflow-hidden group hover:ring-slate-300 transition-all">
                                                <CardHeader className="pb-2 pt-3 px-4">
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-2 text-slate-400 text-[10px] uppercase font-bold tracking-wider">
                                                            <Calendar className="h-3 w-3" />
                                                            {formatDate(m.timestamp)}
                                                        </div>
                                                        <Badge className={`text-[9px] uppercase font-bold tracking-tight border-0 ${m.emotional_tone?.toLowerCase().includes('positive') ? 'bg-emerald-100 text-emerald-700' :
                                                            m.emotional_tone?.toLowerCase().includes('negative') ? 'bg-red-100 text-red-700' :
                                                                'bg-slate-100 text-slate-600'
                                                            }`}>
                                                            {m.emotional_tone || 'Neutral'}
                                                        </Badge>
                                                    </div>
                                                </CardHeader>
                                                <CardContent className="px-4 pb-4 space-y-3">
                                                    <p className="text-slate-800 text-sm leading-relaxed font-medium">
                                                        {m.summary}
                                                    </p>
                                                    <div className="flex items-start gap-3 p-2.5 rounded-lg bg-slate-50 border border-slate-100/50">
                                                        <MessageSquare className="h-3.5 w-3.5 text-slate-400 mt-0.5 shrink-0" />
                                                        <p className="text-xs text-slate-500 italic leading-relaxed">
                                                            "{m.transcript}"
                                                        </p>
                                                    </div>
                                                    {m.key_topics && m.key_topics.length > 0 && (
                                                        <div className="flex flex-wrap gap-1.5 pt-1">
                                                            {m.key_topics.map((t: string, i: number) => (
                                                                <span key={i} className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-medium bg-slate-100 text-slate-500 border border-slate-200">
                                                                    #{t}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    )}
                                                </CardContent>
                                            </Card>
                                        ))}
                                    </div>
                                </ScrollArea>
                            </>
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center text-center p-8 rounded-3xl border-2 border-dashed border-slate-200 bg-slate-50/50">
                                <div className="h-16 w-16 bg-white rounded-full flex items-center justify-center shadow-sm mb-4">
                                    <User className="h-8 w-8 text-slate-300" />
                                </div>
                                <h3 className="text-lg font-bold text-slate-500">Select a Profile</h3>
                                <p className="text-slate-400 text-sm max-w-xs mt-1">Select a person from the list to view their memory timeline.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </main>
    );
}
