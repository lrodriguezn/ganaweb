"use client"

import { AnimalGallery, type AnimalImageItem } from "@ganaweb/ui"
import { createFileRoute } from "@tanstack/react-router"
import type * as React from "react"
import {
  attachAnimalImageAction,
  getAnimalFichaAction,
} from "../../../../../../server/animal-actions.js"

export const Route = createFileRoute("/_app/fincas/$fincaId/animales/$animalId/imagenes")({
  loader: ({ params }) =>
    getAnimalFichaAction({ data: { fincaId: params.fincaId, animalId: params.animalId } }),
  component: AnimalImagesRoute,
})

function toGalleryImage(image: {
  readonly id: string
  readonly esPrincipal: boolean
  readonly estadoSubida: string
}): AnimalImageItem {
  return {
    id: image.id,
    src: `/api/animales/imagenes/${image.id}`,
    alt: `Foto ${image.id}`,
    principal: image.esPrincipal,
    pendingUpload: image.estadoSubida === "pendiente",
  }
}

function AnimalImagesRoute() {
  const params = Route.useParams()
  const data = Route.useLoaderData()
  const images = data.tipo === "ficha" ? data.imagenes.map(toGalleryImage) : []
  const canEdit = data.tipo === "ficha" && data.permissions.canEdit

  const attachSubmittedImage = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const file = new FormData(event.currentTarget).get("imagen")
    if (!(file instanceof File)) return
    void attachAnimalImageAction({
      data: {
        fincaId: params.fincaId,
        animalId: params.animalId,
        imagen: {
          id: file.name,
          mimeType: file.type || "application/octet-stream",
          bytes: file.size,
        },
      },
    })
  }

  return (
    <div className="mx-auto max-w-5xl p-4">
      <AnimalGallery
        images={images}
        onAddImage={() => document.getElementById("animal-image-input")?.click()}
      />
      <form className="mt-3 flex gap-2" onSubmit={attachSubmittedImage}>
        <input id="animal-image-input" name="imagen" type="file" accept="image/*" />
        <button type="submit" className="min-h-[--h-touch] underline" disabled={!canEdit}>
          Adjuntar foto
        </button>
      </form>
      {!canEdit && (
        <p className="mt-3 text-support text-muted-foreground">
          No tienes permiso para editar fotos.
        </p>
      )}
    </div>
  )
}
