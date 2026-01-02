"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight, Globe, Bell, X } from "lucide-react";
import type { AnalyticsOverview } from "../../hooks/use-analytics-overview";

type StatsDockProps = {
	data: AnalyticsOverview;
};

export function StatsDock({ data }: StatsDockProps) {
	const [isOpen, setIsOpen] = useState(true);

	return (
		<div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
			<AnimatePresence mode="wait">
				{isOpen ? (
					<motion.div
						key="dock-open"
						initial={{ height: 48, width: 48, opacity: 1 }}
						animate={{ height: "auto", width: 360, opacity: 1 }}
						exit={{ height: 48, width: 48, opacity: 1 }}
						transition={{ duration: 0.3, ease: "easeInOut" }}
						className="rounded-2xl backdrop-blur-xl overflow-hidden relative"
						style={{
							background: "rgba(11, 11, 18, 0.95)",
							border: "1px solid",
							borderImage: "linear-gradient(135deg, rgba(139, 92, 246, 0.1), rgba(59, 130, 246, 0.1)) 1",
							boxShadow: "0 20px 60px rgba(0, 0, 0, 0.5)",
						}}
					>
						{/* Close button */}
						<button
							type="button"
							onClick={() => setIsOpen(false)}
							className="absolute top-3 right-3 w-6 h-6 rounded-full bg-white/10 hover:bg-white/20 transition-colors flex items-center justify-center z-10"
							title="Close"
						>
							<X className="w-3.5 h-3.5 text-white/60" />
						</button>

						{/* Pages */}
						<div className="px-5 py-4 border-b border-white/5">
							<div className="text-xs text-white/40 mb-3 font-medium tracking-wide uppercase">
								Pages
							</div>
							<div className="space-y-2">
								{data.pages.slice(0, 3).map((page, i) => (
									<div key={i} className="flex items-center justify-between group cursor-pointer">
										<span className="text-xs text-white/60 truncate max-w-[180px]">
											{page.path}
										</span>
										<div className="flex items-center gap-2">
											<div className="px-3 py-1 rounded-full bg-white/5 border border-white/10">
												<span className="text-xs font-mono text-white/80 font-semibold tabular-nums">
													{page.count}
												</span>
											</div>
											<ChevronRight className="w-3 h-3 text-white/20 group-hover:text-white/40 transition-colors" />
										</div>
									</div>
								))}
							</div>
						</div>

						{/* Referrers */}
						<div className="px-5 py-4 border-b border-white/5">
							<div className="text-xs text-white/40 mb-3 font-medium tracking-wide uppercase">
								Referrers
							</div>
							<div className="space-y-2">
								{data.referrers.slice(0, 3).map((ref, i) => (
									<div key={i} className="flex items-center justify-between group cursor-pointer">
										<span className="text-xs text-white/60 truncate max-w-[180px]">
											{new URL(ref.source.startsWith("http") ? ref.source : `https://${ref.source}`).hostname}
										</span>
										<div className="flex items-center gap-2">
											<div className="px-3 py-1 rounded-full bg-white/5 border border-white/10">
												<span className="text-xs font-mono text-white/80 font-semibold tabular-nums">
													{ref.count}
												</span>
											</div>
											<ChevronRight className="w-3 h-3 text-white/20 group-hover:text-white/40 transition-colors" />
										</div>
									</div>
								))}
							</div>
						</div>

						{/* Countries */}
						<div className="px-5 py-4 border-b border-white/5">
							<div className="text-xs text-white/40 mb-3 font-medium tracking-wide uppercase">
								Countries
							</div>
							<div className="space-y-2">
								{data.countries.slice(0, 3).map((country, i) => (
									<div key={i} className="flex items-center justify-between group cursor-pointer">
										<span className="text-xs text-white/60 truncate max-w-[180px]">
											{country.name}
										</span>
										<div className="flex items-center gap-2">
											<div className="px-3 py-1 rounded-full bg-white/5 border border-white/10 flex items-center gap-2">
												<span className="text-sm">{getCountryFlag(country.code)}</span>
												<span className="text-xs font-mono text-white/80 font-semibold tabular-nums">
													{country.count}
												</span>
											</div>
											<ChevronRight className="w-3 h-3 text-white/20 group-hover:text-white/40 transition-colors" />
										</div>
									</div>
								))}
							</div>
						</div>

						{/* Bottom icon row */}
						<div className="px-5 py-3 flex items-center justify-center gap-4">
							<button
								type="button"
								className="flex items-center justify-center w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 transition-colors"
							>
								<Bell className="w-4 h-4 text-white/60" />
							</button>
							<button
								type="button"
								className="flex items-center justify-center gap-2 px-4 h-10 rounded-full bg-white/5 hover:bg-white/10 transition-colors"
							>
								<Globe className="w-4 h-4 text-white/60" />
								<span className="text-sm font-mono text-white/80 font-semibold tabular-nums">
									{data.totalViews}
								</span>
							</button>
						</div>
					</motion.div>
				) : (
					<motion.button
						key="dock-closed"
						type="button"
						initial={{ height: 48, width: 48, opacity: 1 }}
						animate={{ height: 48, width: 48, opacity: 1 }}
						exit={{ height: 48, width: 48, opacity: 1 }}
						transition={{ duration: 0.3, ease: "easeInOut" }}
						onClick={() => setIsOpen(true)}
						className="rounded-full backdrop-blur-xl flex items-center justify-center"
						style={{
							background: "rgba(11, 11, 18, 0.95)",
							border: "1px solid rgba(139, 92, 246, 0.2)",
							boxShadow: "0 10px 30px rgba(0, 0, 0, 0.5)",
						}}
						title="Open Stats"
					>
						<Globe className="w-5 h-5 text-white/80" />
					</motion.button>
				)}
			</AnimatePresence>
		</div>
	);
}

function getCountryFlag(code: string): string {
	if (!code || code === "Unknown" || code.length !== 2) {
		return "🌍";
	}
	const codePoints = code
		.toUpperCase()
		.split("")
		.map((char) => 127397 + char.charCodeAt(0));
	return String.fromCodePoint(...codePoints);
}
