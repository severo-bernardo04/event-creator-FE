import React from "react";

type Props = {
	params: { id: string };
};

export default function Page({ params }: Props) {
	return (
		<div className="min-h-screen flex items-center justify-center text-white">
			<p>Evento ID: {params.id}</p>
		</div>
	);
}
