import { linkModel } from '../models/linkModel'
import { Response } from 'express'
import { validateLink, validatePartialLink } from '../validation/linksZodSchema'
import { getLinkNameByUrlLocal, getLinkStatusLocal } from '../utils/linksUtils'
import { AuthenticatedRequest } from '../types/express'

/* eslint-disable @typescript-eslint/no-extraneous-class */
export class linksController {
  static async getAllLinks (req: AuthenticatedRequest, res: Response): Promise<Response> {
    try {
      const user = req.user?.name ?? 'SergioSR'
      const data = await linkModel.getAllLinks({ user })
      return res.status(200).json({ status: 'success', data })
    } catch (error) {
      return res.status(500).send(error)
    }
  }

  static async getLinkById (req: AuthenticatedRequest, res: Response): Promise<Response> {
    const user = req.user.name
    console.log(req.params)
    console.log('Entramos en by id')
    try {
      const link = await linkModel.getLinkById({ user, id: req.params.id })
      return res.status(200).json(link)
    } catch (error) {
      return res.status(500).send(error)
    }
  }

  static async getAllLinksByCategory (req: AuthenticatedRequest, res: Response): Promise<Response> {
    console.log(req.user)
    const user = req.user.name
    console.log('Entramos en by desktop')
    console.log(req.query)
    try {
      const topCategory = typeof req.query.category === 'string' ? req.query.category : ''
      const data = await linkModel.getLinksByTopCategory({ user, topCategory })
      return res.status(200).json({ status: 'success', data })
    } catch (error) {
      return res.status(500).send(error)
    }
  }

  static async getLinksCount (req: AuthenticatedRequest, res: Response): Promise<Response> {
    const user = req.user.name
    try {
      const category = typeof req.query.category === 'string' ? req.query.category : undefined
      const linksCount = await linkModel.getLinksCount({ user, category })
      return res.status(200).json(linksCount)
    } catch (error) {
      return res.status(500).send(error)
    }
  }

  static async createLink (req: AuthenticatedRequest, res: Response): Promise<Response> {
    const user = req.user.name
    const [item] = req.body.data // Esto peta si no es iterable
    item.user = user
    const validatedLink = validateLink(item)
    console.log(validatedLink)
    // Crear mensaje de error
    if (!validatedLink.success) {
      const errorsMessageArray = validatedLink.error?.errors.map((error) => {
        return error.message
      })
      return res.status(400).json({ status: 'fail', message: errorsMessageArray })
    }
    const cleanData = validatedLink.data
    try {
      const link = await linkModel.createLink({ cleanData })
      return res.status(201).json({ status: 'success', link })
    } catch (error) {
      return res.status(500).send(error)
    }
  }

  static async updateLink (req: AuthenticatedRequest, res: Response): Promise<Response> {
    const user = req.user.name
    console.log(req.body)
    const item = req.body.fields
    const { idpanelOrigen, destinyIds } = req.body
    console.log('🚀 ~ file: linksController.js:77 ~ linksController ~ updateLink ~ idpanelOrigen:', idpanelOrigen)
    item.user = user
    console.log(req.body.idpanelOrigen)
    const validatedLink = validatePartialLink(item)
    console.log(validatedLink)
    const id = req.body.id
    if (!validatedLink.success) {
      const errorsMessageArray = validatedLink.error?.errors.map((error) => {
        return error.message
      })
      return res.status(400).json({ status: 'fail', message: errorsMessageArray })
    }
    const cleanData = validatedLink.data
    try {
      const link = await linkModel.updateLink({ id, user, idpanelOrigen, cleanData, destinyIds })
      return res.status(200).json({ status: 'success', link })
    } catch (error) {
      return res.status(500).send(error)
    }
  }

  static async deleteLink (req: AuthenticatedRequest, res: Response): Promise<Response> {
    console.log(req.body.linkId)
    try {
      const user = req.user.name
      const { linkId } = req.body
      const link = await linkModel.deleteLink({ user, linkId })
      if (link !== null && link !== undefined) {
        return res.status(200).send({ status: 'success', link })
      }
      return res.status(404).send({ status: 'fail', message: 'El link no existe' })
    } catch (error) {
      return res.status(500).send(error)
    }
  }

  static async bulkMoveLinks (req: AuthenticatedRequest, res: Response): Promise<Response> {
    const user = req.user.name
    const { source, destiny, panel, links, escritorio } = req.body
    try {
      const link = await linkModel.bulkMoveLinks({ user, source, destiny, panel, links, escritorio })
      return res.status(200).send({ status: 'success', link })
    } catch (error) {
      return res.status(500).send(error)
    }
  }

  static async getLinkNameByUrl (req: AuthenticatedRequest, res: Response): Promise<Response> {
    const url = typeof req.query.url === 'string' ? req.query.url : ''
    const data = await getLinkNameByUrlLocal({ url })
    return res.send(data)
  }

  static async getLinkStatus (req: AuthenticatedRequest, res: Response): Promise<Response> {
    const url = typeof req.query.url === 'string' ? req.query.url : ''
    const data = await getLinkStatusLocal({ url })
    return res.send(data)
  }

  static async findDuplicateLinks (req: AuthenticatedRequest, res: Response): Promise<Response> {
    const user = req.user.name
    const data = await linkModel.findDuplicateLinks({ user })
    return res.send(data)
  }

  static async setBookMarksOrder (req: AuthenticatedRequest, res: Response): Promise<Response> {
    const user = req.user.name
    const { links } = req.body
    console.log('🚀 ~ linksController ~ setBookMarksOrder ~ links:', links)
    try {
      const data = await linkModel.setBookMarksOrder({ user, links })
      return res.status(200).send({ status: 'success', data })
    } catch (error) {
      return res.status(500).send(error)
    }
  }
}
