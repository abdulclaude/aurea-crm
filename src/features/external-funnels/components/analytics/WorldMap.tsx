"use client";

import { useEffect, useRef, useState } from "react";
import type { GeoPoint } from "../../hooks/use-analytics-overview";

type WorldMapProps = {
	geoPoints: GeoPoint[];
};

type Point = { x: number; y: number };
type Transform = { x: number; y: number; scale: number };

// Calculate the center point of an SVG path element
function getPathCenter(path: SVGPathElement): { x: number; y: number } | null {
	try {
		const bbox = path.getBBox();
		return {
			x: bbox.x + bbox.width / 2,
			y: bbox.y + bbox.height / 2,
		};
	} catch {
		return null;
	}
}

export function WorldMap({ geoPoints }: WorldMapProps) {
	const svgRef = useRef<SVGSVGElement>(null);
	const containerRef = useRef<HTMLDivElement>(null);
	const contentRef = useRef<SVGGElement>(null);
	
	const [hoveredCountry, setHoveredCountry] = useState<string | null>(null);
	const [hoveredMarker, setHoveredMarker] = useState<GeoPoint | null>(null);
	const [markerPosition, setMarkerPosition] = useState<Point | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	
	// Transform state for pan and zoom (start at 80% zoom)
	const [transform, setTransform] = useState<Transform>({ x: 0, y: 0, scale: 0.8 });
	const [isDragging, setIsDragging] = useState(false);
	const [dragStart, setDragStart] = useState<Point>({ x: 0, y: 0 });

	// Prevent page scroll when mouse is over the map
	useEffect(() => {
		const container = containerRef.current;
		if (!container) return;

		const preventScroll = (e: WheelEvent) => {
			e.preventDefault();
		};

		container.addEventListener('wheel', preventScroll, { passive: false });

		return () => {
			container.removeEventListener('wheel', preventScroll);
		};
	}, []);

	// Load and render the world map
	useEffect(() => {
		if (!svgRef.current || !contentRef.current) return;

		setIsLoading(true);

		fetch("/world.svg")
			.then((res) => res.text())
			.then((svgContent) => {
				if (!contentRef.current || !svgRef.current) return;

				const parser = new DOMParser();
				const svgDoc = parser.parseFromString(svgContent, "image/svg+xml");
				const svgElement = svgDoc.querySelector("svg");

				if (svgElement) {
					// Clear existing content
					contentRef.current.innerHTML = "";

					// Set viewBox to match the SVG dimensions
					svgRef.current.setAttribute("viewBox", "0 0 1009.6727 665.96301");
					svgRef.current.setAttribute("preserveAspectRatio", "xMidYMid meet");

					// Copy all country paths
					Array.from(svgElement.children).forEach((child) => {
						const clonedChild = child.cloneNode(true) as SVGElement;
						contentRef.current?.appendChild(clonedChild);
					});

					// Style all country paths
					const paths = contentRef.current.querySelectorAll("path");
					paths.forEach((path) => {
						const countryId = path.getAttribute("id");
						const countryData = geoPoints.find((p) => p.countryCode === countryId);

						// Light mode base styles
						path.setAttribute("fill", "#f9fafb");
						path.setAttribute("stroke", "rgba(0, 0, 0, 0.2)");
						path.setAttribute("stroke-width", "0.3");
						path.setAttribute("stroke-dasharray", "2,2");
						path.setAttribute("vector-effect", "non-scaling-stroke");

						// Highlight countries with sessions
						if (countryData) {
							const intensity = Math.min(countryData.count / 10, 1);
							const color = getHeatColor(intensity);
							path.setAttribute("fill", color);
							path.setAttribute("stroke", "rgba(99, 102, 241, 0.6)");
							path.setAttribute("stroke-width", "0.5");
							path.style.cursor = "pointer";
							path.style.transition = "all 0.2s ease";

							// Add hover effect
							path.addEventListener("mouseenter", () => {
								path.setAttribute("fill", getHeatColor(intensity, true));
								path.setAttribute("stroke", "rgba(99, 102, 241, 0.9)");
								path.setAttribute("stroke-width", "1");
								setHoveredCountry(countryData.country);
							});

							path.addEventListener("mouseleave", () => {
								path.setAttribute("fill", color);
								path.setAttribute("stroke", "rgba(99, 102, 241, 0.6)");
								path.setAttribute("stroke-width", "0.5");
								setHoveredCountry(null);
							});
						}
					});

					// Add country labels
					setTimeout(() => {
						if (!contentRef.current) return;
						
						const pathsWithLabels = contentRef.current.querySelectorAll("path[id]");
						const majorCountries = ["US", "CA", "MX", "BR", "AR", "GB", "FR", "DE", "IT", "ES", "RU", "CN", "IN", "AU", "JP", "ZA", "EG", "NG", "SA", "AE", "TR"];
						
						pathsWithLabels.forEach((path) => {
							const countryCode = path.getAttribute("id");
							if (countryCode && majorCountries.includes(countryCode)) {
								const center = getPathCenter(path as SVGPathElement);
								if (center) {
									const label = createCountryLabel(countryCode, center);
									contentRef.current?.appendChild(label);
								}
							}
						});

						// Add session markers on top
						geoPoints.forEach((point) => {
							// Find the path for this country
							const countryPath = contentRef.current?.querySelector(`path[id="${point.countryCode}"]`) as SVGPathElement;
							if (countryPath) {
								const center = getPathCenter(countryPath);
								if (center) {
									const marker = createMarker(point, center, (e: MouseEvent, p: GeoPoint) => {
										const rect = svgRef.current?.getBoundingClientRect();
										if (rect) {
											setMarkerPosition({ x: e.clientX - rect.left, y: e.clientY - rect.top });
											setHoveredMarker(p);
										}
									}, () => {
										setHoveredMarker(null);
										setMarkerPosition(null);
									});
									contentRef.current?.appendChild(marker);
								}
							}
						});

						setIsLoading(false);
					}, 100); // Small delay to ensure paths are rendered
				}
			})
			.catch((error) => {
				console.error("Failed to load world map:", error);
				setIsLoading(false);
			});
	}, [geoPoints]);

	// Handle mouse down for dragging
	const handleMouseDown = (e: React.MouseEvent<SVGSVGElement>) => {
		setIsDragging(true);
		setDragStart({ x: e.clientX - transform.x, y: e.clientY - transform.y });
	};

	// Handle mouse move for dragging with constraints
	const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
		if (!isDragging || !containerRef.current) return;
		
		const containerRect = containerRef.current.getBoundingClientRect();
		const svgWidth = 1009.6727;
		const svgHeight = 665.96301;
		
		// Calculate scaled dimensions
		const scaledWidth = svgWidth * transform.scale;
		const scaledHeight = svgHeight * transform.scale;
		
		// Calculate max drag boundaries
		const maxX = Math.max(0, (scaledWidth - containerRect.width) / 2);
		const maxY = Math.max(0, (scaledHeight - containerRect.height) / 2);
		
		// Calculate new position
		let newX = e.clientX - dragStart.x;
		let newY = e.clientY - dragStart.y;
		
		// Apply constraints
		newX = Math.max(-maxX, Math.min(maxX, newX));
		newY = Math.max(-maxY, Math.min(maxY, newY));
		
		setTransform((prev) => ({
			...prev,
			x: newX,
			y: newY,
		}));
	};

	// Handle mouse up to stop dragging
	const handleMouseUp = () => {
		setIsDragging(false);
	};

	// Handle wheel for zooming with constraint updates
	const handleWheel = (e: React.WheelEvent<SVGSVGElement>) => {
		e.preventDefault();
		e.stopPropagation();
		
		if (!containerRef.current) return;
		
		const delta = -e.deltaY * 0.001;
		const newScale = Math.max(0.8, Math.min(5, transform.scale + delta)); // Min zoom is 80%
		
		// Adjust pan position to keep content in bounds when zooming
		const containerRect = containerRef.current.getBoundingClientRect();
		const svgWidth = 1009.6727;
		const svgHeight = 665.96301;
		
		const scaledWidth = svgWidth * newScale;
		const scaledHeight = svgHeight * newScale;
		
		const maxX = Math.max(0, (scaledWidth - containerRect.width) / 2);
		const maxY = Math.max(0, (scaledHeight - containerRect.height) / 2);
		
		// Constrain existing pan position
		const constrainedX = Math.max(-maxX, Math.min(maxX, transform.x));
		const constrainedY = Math.max(-maxY, Math.min(maxY, transform.y));
		
		setTransform({
			x: constrainedX,
			y: constrainedY,
			scale: newScale,
		});
	};

	// Reset view to initial 80% zoom
	const handleReset = () => {
		setTransform({ x: 0, y: 0, scale: 0.8 });
	};

	return (
		<div ref={containerRef} className="relative w-full h-full bg-white rounded-lg overflow-hidden min-h-[800px]">
			{isLoading && (
				<div className="absolute inset-0 flex items-center justify-center z-20 bg-white">
					<div className="flex flex-col items-center gap-3">
						<div className="w-8 h-8 border-4 border-gray-200 border-t-primary rounded-full animate-spin" />
						<div className="text-sm font-medium text-gray-600">Loading world map...</div>
					</div>
				</div>
			)}

			<svg
				ref={svgRef}
				className="w-full h-full"
				style={{
					cursor: isDragging ? "grabbing" : "grab",
					filter: "drop-shadow(0 2px 4px rgba(0, 0, 0, 0.1))",
				}}
				onMouseDown={handleMouseDown}
				onMouseMove={handleMouseMove}
				onMouseUp={handleMouseUp}
				onMouseLeave={handleMouseUp}
				onWheel={handleWheel}
			>
				<g
					ref={contentRef}
					transform={`translate(${transform.x}, ${transform.y}) scale(${transform.scale})`}
					style={{ transformOrigin: "center" }}
				/>
			</svg>

			{/* Country hover tooltip */}
			{hoveredCountry && (
				<div className="absolute top-4 left-4 bg-white border border-gray-200 rounded-lg px-4 py-2 pointer-events-none z-10 shadow-lg">
					<div className="text-sm font-semibold text-gray-900">{hoveredCountry}</div>
					<div className="text-xs text-gray-500">
						{geoPoints.find((p) => p.country === hoveredCountry)?.count || 0} sessions
					</div>
				</div>
			)}

			{/* Marker hover tooltip */}
			{hoveredMarker && markerPosition && (
				<div
					className="absolute bg-white border border-primary/30 rounded-lg px-3 py-2 pointer-events-none z-20 shadow-xl"
					style={{
						left: markerPosition.x + 10,
						top: markerPosition.y - 10,
					}}
				>
					<div className="text-sm font-semibold text-gray-900">{hoveredMarker.country}</div>
					<div className="text-xs text-gray-600 mt-1">
						<div className="flex items-center gap-1">
							<span className="font-medium">{hoveredMarker.count}</span>
							<span>session{hoveredMarker.count === 1 ? "" : "s"}</span>
						</div>
					</div>
					<div className="text-xs text-gray-400 mt-0.5">
						Code: {hoveredMarker.countryCode}
					</div>
				</div>
			)}

			{/* Controls */}
			<div className="absolute top-4 right-4 flex flex-col gap-2 z-10">
				<button
					type="button"
					onClick={() => {
						if (!containerRef.current) return;
						const newScale = Math.min(5, transform.scale + 0.2);
						const containerRect = containerRef.current.getBoundingClientRect();
						const svgWidth = 1009.6727;
						const svgHeight = 665.96301;
						const scaledWidth = svgWidth * newScale;
						const scaledHeight = svgHeight * newScale;
						const maxX = Math.max(0, (scaledWidth - containerRect.width) / 2);
						const maxY = Math.max(0, (scaledHeight - containerRect.height) / 2);
						const constrainedX = Math.max(-maxX, Math.min(maxX, transform.x));
						const constrainedY = Math.max(-maxY, Math.min(maxY, transform.y));
						setTransform({ x: constrainedX, y: constrainedY, scale: newScale });
					}}
					className="bg-white border border-gray-200 rounded-lg p-2 hover:bg-gray-50 transition-colors shadow-md"
					title="Zoom In"
				>
					<svg className="w-5 h-5 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
					</svg>
				</button>
				<button
					type="button"
					onClick={() => {
						if (!containerRef.current) return;
						const newScale = Math.max(0.8, transform.scale - 0.2); // Min zoom is 80%
						const containerRect = containerRef.current.getBoundingClientRect();
						const svgWidth = 1009.6727;
						const svgHeight = 665.96301;
						const scaledWidth = svgWidth * newScale;
						const scaledHeight = svgHeight * newScale;
						const maxX = Math.max(0, (scaledWidth - containerRect.width) / 2);
						const maxY = Math.max(0, (scaledHeight - containerRect.height) / 2);
						const constrainedX = Math.max(-maxX, Math.min(maxX, transform.x));
						const constrainedY = Math.max(-maxY, Math.min(maxY, transform.y));
						setTransform({ x: constrainedX, y: constrainedY, scale: newScale });
					}}
					className="bg-white border border-gray-200 rounded-lg p-2 hover:bg-gray-50 transition-colors shadow-md"
					title="Zoom Out"
				>
					<svg className="w-5 h-5 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
					</svg>
				</button>
				<button
					type="button"
					onClick={handleReset}
					className="bg-white border border-gray-200 rounded-lg p-2 hover:bg-gray-50 transition-colors shadow-md"
					title="Reset View"
				>
					<svg className="w-5 h-5 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
					</svg>
				</button>
			</div>

			{/* Legend */}
			<div className="absolute bottom-4 right-4 bg-white border border-gray-200 rounded-lg px-4 py-3 z-10 shadow-lg">
				<div className="text-xs font-semibold text-gray-700 mb-2">Session Intensity</div>
				<div className="flex items-center gap-2">
					<div className="flex items-center gap-1">
						<div className="w-4 h-4 rounded-sm border border-gray-300" style={{ backgroundColor: getHeatColor(0.2) }} />
						<span className="text-xs text-gray-600">Low</span>
					</div>
					<div className="flex items-center gap-1">
						<div className="w-4 h-4 rounded-sm border border-gray-300" style={{ backgroundColor: getHeatColor(0.5) }} />
						<span className="text-xs text-gray-600">Med</span>
					</div>
					<div className="flex items-center gap-1">
						<div className="w-4 h-4 rounded-sm border border-gray-300" style={{ backgroundColor: getHeatColor(1.0) }} />
						<span className="text-xs text-gray-600">High</span>
					</div>
				</div>
			</div>

			{/* Zoom level indicator */}
			<div className="absolute bottom-4 left-4 bg-white border border-gray-200 rounded-lg px-3 py-2 z-10 shadow-md">
				<div className="text-xs font-medium text-gray-700">
					Zoom: {(transform.scale * 100).toFixed(0)}%
				</div>
			</div>
		</div>
	);
}

// Create country label
function createCountryLabel(countryCode: string, center: Point): SVGTextElement {
	const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
	
	text.setAttribute("x", center.x.toString());
	text.setAttribute("y", center.y.toString());
	text.setAttribute("font-size", "10");
	text.setAttribute("font-weight", "600");
	text.setAttribute("fill", "rgba(0, 0, 0, 0.4)");
	text.setAttribute("text-anchor", "middle");
	text.setAttribute("dominant-baseline", "middle");
	text.setAttribute("pointer-events", "none");
	text.textContent = countryCode;
	
	return text;
}

// Create animated marker for each session location
function createMarker(
	point: GeoPoint,
	center: Point,
	onMouseEnter: (e: MouseEvent, point: GeoPoint) => void,
	onMouseLeave: () => void
): SVGGElement {
	const group = document.createElementNS("http://www.w3.org/2000/svg", "g");

	// Offset marker slightly above center to avoid overlapping with country code
	const x = center.x;
	const y = center.y - 15; // Move marker up by 15px

	// Outer pulse circle (animated)
	const pulse = document.createElementNS("http://www.w3.org/2000/svg", "circle");
	pulse.setAttribute("cx", x.toString());
	pulse.setAttribute("cy", y.toString());
	pulse.setAttribute("r", "6");
	pulse.setAttribute("fill", "rgba(99, 102, 241, 0.2)");
	pulse.setAttribute("stroke", "rgba(99, 102, 241, 0.4)");
	pulse.setAttribute("stroke-width", "1");

	// Animate pulse
	const animate = document.createElementNS("http://www.w3.org/2000/svg", "animate");
	animate.setAttribute("attributeName", "r");
	animate.setAttribute("values", "6;10;6");
	animate.setAttribute("dur", "2s");
	animate.setAttribute("repeatCount", "indefinite");
	pulse.appendChild(animate);

	const animateOpacity = document.createElementNS("http://www.w3.org/2000/svg", "animate");
	animateOpacity.setAttribute("attributeName", "opacity");
	animateOpacity.setAttribute("values", "0.4;0.1;0.4");
	animateOpacity.setAttribute("dur", "2s");
	animateOpacity.setAttribute("repeatCount", "indefinite");
	pulse.appendChild(animateOpacity);

	// Inner solid circle
	const dot = document.createElementNS("http://www.w3.org/2000/svg", "circle");
	dot.setAttribute("cx", x.toString());
	dot.setAttribute("cy", y.toString());
	dot.setAttribute("r", "4");
	dot.setAttribute("fill", "#6366f1");
	dot.setAttribute("stroke", "white");
	dot.setAttribute("stroke-width", "2");
	dot.style.cursor = "pointer";
	dot.style.filter = "drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3))";

	// Add hover events
	dot.addEventListener("mouseenter", (e) => onMouseEnter(e, point));
	dot.addEventListener("mouseleave", onMouseLeave);

	group.appendChild(pulse);
	group.appendChild(dot);

	return group;
}

// Generate heat color based on intensity (0-1) - Light mode friendly
function getHeatColor(intensity: number, hover = false): string {
	if (intensity < 0.3) {
		// Low: Light Blue
		return hover ? "rgba(59, 130, 246, 0.4)" : "rgba(59, 130, 246, 0.25)";
	}
	if (intensity < 0.6) {
		// Medium: Violet
		return hover ? "rgba(139, 92, 246, 0.5)" : "rgba(139, 92, 246, 0.35)";
	}
	// High: Indigo
	return hover ? "rgba(99, 102, 241, 0.7)" : "rgba(99, 102, 241, 0.5)";
}
